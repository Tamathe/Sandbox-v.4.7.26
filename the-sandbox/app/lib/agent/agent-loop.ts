/**
 * Sandy Universal Agent — Core Agentic Loop
 *
 * Orchestrates the plan → execute → observe → respond cycle.
 * Runs server-side, streams typed SSE events to the client.
 *
 * Flow:
 *   1. Receive message + conversation history
 *   2. Claude reasons over context + available tools
 *   3. If tool_use → execute (auto) or request approval (confirm)
 *   4. Feed tool results back to Claude
 *   5. Repeat until end_turn or max iterations
 *   6. Stream final response
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentActionLog,
  AgentChatRequest,
  AgentLoopConfig,
  AgentSSEEvent,
  AgentUser,
  ApprovalDecision,
  ApprovalRequest,
  ToolResult,
} from './agent-types';
import { buildAgentSystemPrompt, type UniversitySystemsSnapshot } from './agent-system-prompt';
import { getAgentProfile, incrementUseCount, saveAgentSession } from './agent-profile-service';
import { createSandyExecutionRecorder } from './execution-traces';
import { getToolRegistry, type ToolRegistry } from './tool-registry';
import { getFacultyPaperReviews, getAttendanceSummary, checkEnrollmentChanges } from '../university-systems-service';
import { prisma } from '../prisma';

// ---------------------------------------------------------------------------
// Approval Manager (in-memory, per-request)
// ---------------------------------------------------------------------------

/**
 * Manages pending approvals for a single agent session.
 *
 * The SSE stream pauses when a confirm-level tool is hit.
 * The client POSTs to /api/agent/approve to resolve.
 * We use a simple Promise-based approach: the agent loop awaits
 * a promise that resolves when the approval comes in.
 */
export class ApprovalManager {
  private pending: Map<string, {
    request: ApprovalRequest;
    resolve: (decision: ApprovalDecision) => void;
  }> = new Map();

  /** Create a pending approval and return a promise that resolves with the decision */
  waitForApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    return new Promise<ApprovalDecision>((resolve) => {
      this.pending.set(request.id, { request, resolve });
    });
  }

  /** Resolve a pending approval (called from the /api/agent/approve route) */
  resolve(approvalId: string, decision: ApprovalDecision): boolean {
    const entry = this.pending.get(approvalId);
    if (!entry) return false;
    entry.resolve(decision);
    this.pending.delete(approvalId);
    return true;
  }

  /** Check if there's a pending approval */
  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** Get pending approval request by ID */
  getPending(id: string): ApprovalRequest | undefined {
    return this.pending.get(id)?.request;
  }
}

// ---------------------------------------------------------------------------
// Session Store (maps sessionId → ApprovalManager)
// ---------------------------------------------------------------------------

const sessionApprovalManagers = new Map<string, ApprovalManager>();

export function getApprovalManager(sessionId: string): ApprovalManager {
  let mgr = sessionApprovalManagers.get(sessionId);
  if (!mgr) {
    mgr = new ApprovalManager();
    sessionApprovalManagers.set(sessionId, mgr);
  }
  return mgr;
}

export function cleanupSession(sessionId: string): void {
  sessionApprovalManagers.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Audit Log (in-memory for demo)
// ---------------------------------------------------------------------------

const MAX_AUDIT_LOG = 500;
const auditLog: AgentActionLog[] = [];

export function getAuditLog(): AgentActionLog[] {
  return auditLog;
}

function logAction(entry: AgentActionLog): void {
  if (auditLog.length >= MAX_AUDIT_LOG) {
    // Splice from the front in one operation instead of O(n) shift per entry
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG + 1);
  }
  auditLog.push(entry);
}

// ---------------------------------------------------------------------------
// SSE Helpers
// ---------------------------------------------------------------------------

function encodeSSE(event: AgentSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const AGENT_MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

/** Rough token estimate: ~4 chars per token for English text */
function estimateTokens(messages: Anthropic.MessageParam[]): number {
  let chars = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      chars += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if ('text' in block && typeof block.text === 'string') chars += block.text.length;
        else if ('content' in block && typeof block.content === 'string') chars += block.content.length;
        else chars += JSON.stringify(block).length;
      }
    }
  }
  return Math.ceil(chars / 4);
}

/** Max input tokens to use (leave room for system prompt + response) */
const MAX_CONVERSATION_TOKENS = 150_000;

/** Trim oldest messages when conversation gets too long, keeping the first user message for context.
 *  Detects tool_use blocks and removes complete 4-message sequences
 *  (user→assistant[tool_use]→user[tool_result]→assistant) instead of arbitrary pairs. */
function trimConversation(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  while (estimateTokens(messages) > MAX_CONVERSATION_TOKENS && messages.length > 2) {
    // Check if message at index 1 is an assistant message containing tool_use blocks
    const msg = messages[1];
    if (
      msg.role === 'assistant' &&
      Array.isArray(msg.content) &&
      msg.content.some((b: Anthropic.ContentBlockParam) => 'type' in b && b.type === 'tool_use')
    ) {
      // Tool-use sequence: assistant[tool_use] → user[tool_result] → assistant[text]
      // Remove all 4 messages (indices 1-4) if available, otherwise remove what we can
      const seqLen = messages.length >= 5 ? 4 : Math.min(2, messages.length - 1);
      messages.splice(1, seqLen);
    } else {
      // Regular user/assistant pair
      messages.splice(1, 2);
    }
  }
  return messages;
}

// ---------------------------------------------------------------------------
// Safe JSON parse
// ---------------------------------------------------------------------------

function safeJsonParse(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content, parseError: true };
  }
}

// ---------------------------------------------------------------------------
// Tool result size cap
// ---------------------------------------------------------------------------

/** Max chars for a single tool result before truncation (~30KB ≈ 7.5K tokens) */
const MAX_TOOL_RESULT_CHARS = 30_000;

/** Truncate oversized tool results to prevent context bloat */
function capToolResult(result: ToolResult): ToolResult {
  if (result.content.length <= MAX_TOOL_RESULT_CHARS) return result;
  const originalSize = result.content.length;
  // Truncate the raw content first, then wrap in valid JSON
  const truncated = result.content.slice(0, MAX_TOOL_RESULT_CHARS - 300); // leave room for metadata wrapper
  return {
    ...result,
    content: JSON.stringify({
      data: truncated,
      _truncated: true,
      _originalSize: originalSize,
      _message: `Result was ${Math.round(originalSize / 1024)}KB — truncated to ${Math.round(MAX_TOOL_RESULT_CHARS / 1024)}KB. Ask for a narrower query or use pagination.`,
    }),
  };
}

// ---------------------------------------------------------------------------
// Session-scoped tool result cache
// ---------------------------------------------------------------------------

/** Cache key is toolName + stable JSON of args */
function toolCacheKey(toolName: string, args: Record<string, unknown>): string {
  const sortedArgs = JSON.stringify(args, Object.keys(args).sort());
  return `${toolName}::${sortedArgs}`;
}

/** Read-only tools whose results don't change within a session */
const CACHEABLE_TOOLS = new Set([
  'get_current_context',
  'get_user_profile',
  'get_courses',
  'get_course_materials',
  'get_course_roster',
  'lookup_directory',
  'search_campus_map',
  'get_building_details',
  'find_nearest_parking',
  'estimate_walking_route',
  'get_bloom_distribution',
]);

// ---------------------------------------------------------------------------
// Agent Loop
// ---------------------------------------------------------------------------

interface AgentLoopParams {
  request: AgentChatRequest;
  user: AgentUser;
  config?: Partial<AgentLoopConfig>;
  profileId?: string;
}

/**
 * Run the Sandy agent loop and return a ReadableStream of SSE events.
 *
 * The stream contains interleaved thinking, tool_call, tool_result,
 * approval_request, text, and done events.
 */
export function runAgentLoop(params: AgentLoopParams): ReadableStream<Uint8Array> {
  const { request, user, config: configOverrides } = params;
  const config: AgentLoopConfig = {
    maxIterations: configOverrides?.maxIterations ?? 10,
    maxToolCallsPerTurn: configOverrides?.maxToolCallsPerTurn ?? 5,
    approvalTimeoutMs: configOverrides?.approvalTimeoutMs ?? 60_000,
  };

  const sessionId = request.sessionId || generateId();
  const approvalManager = getApprovalManager(sessionId);
  const registry = getToolRegistry();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const recorder = await createSandyExecutionRecorder({
        sessionId,
        request,
        user,
        modelName: AGENT_MODEL,
      });
      const emit = (event: AgentSSEEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
        recorder.recordEvent(event);
      };
      let finalStatus: 'COMPLETED' | 'FAILED' = 'COMPLETED';
      let failureMessage: string | null = null;
      let toolCallCount = 0
      const activeProfileId = params.profileId ?? request.profileId ?? null

      try {
        const result = await executeLoop(
          emit,
          registry,
          approvalManager,
          request,
          user,
          sessionId,
          config,
          activeProfileId,
        )
        toolCallCount = result.toolCallCount
      } catch (err) {
        finalStatus = 'FAILED';
        failureMessage = err instanceof Error ? err.message : 'Agent loop failed';
        emit({ type: 'error', message: failureMessage });
      } finally {
        if (finalStatus === 'COMPLETED' && activeProfileId) {
          await Promise.allSettled([
            incrementUseCount(activeProfileId),
            saveAgentSession(activeProfileId, user.id, request.messages, toolCallCount),
          ])
        }
        emit({ type: 'done' });
        controller.close();
        await recorder.finish({
          status: finalStatus,
          failureMessage,
        });
        // Cleanup session after a delay (allow late approval POSTs to fail gracefully),
        // but always clean up eventually even if the timeout is GC'd in serverless
        const timer = setTimeout(() => cleanupSession(sessionId), 30_000);
        if (typeof timer === 'object' && 'unref' in timer) timer.unref();
      }
    },
  });
}

async function executeLoop(
  emit: (event: AgentSSEEvent) => void,
  registry: ToolRegistry,
  approvalManager: ApprovalManager,
  request: AgentChatRequest,
  user: AgentUser,
  sessionId: string,
  config: AgentLoopConfig,
  profileId?: string | null,
): Promise<{ toolCallCount: number }> {
  const anthropic = new Anthropic();
  let toolCallCount = 0

  // Fetch university systems snapshot for educators/admins (best-effort, non-blocking)
  let universitySystemsSnapshot: UniversitySystemsSnapshot | null = null;
  if (user.role === 'EDUCATOR' || user.role === 'ADMIN') {
    try {
      // Query the user's actual courses instead of a hardcoded placeholder
      const userCourses = await prisma.course.findMany({
        where: { instructorId: user.id },
        select: { id: true },
        take: 10, // Cap to avoid excessive queries
      }).catch(() => []);
      const courseIds = userCourses.map(c => c.id);

      const [reviews, ...courseSnapshots] = await Promise.all([
        getFacultyPaperReviews(user.id).catch(() => []),
        ...courseIds.map(async (courseId) => {
          const [enrollment, attendance] = await Promise.all([
            checkEnrollmentChanges(courseId).catch(() => null),
            getAttendanceSummary(courseId).catch(() => ({ students: [] })),
          ]);
          return { enrollment, attendance };
        }),
      ]);

      // Merge snapshots across all courses
      const allDropped: { studentName: string; droppedAt: string }[] = [];
      const allAdded: { studentName: string; addedAt: string }[] = [];
      const allAtRisk: { studentName: string; absent: number; total: number }[] = [];

      for (const snap of courseSnapshots) {
        if (snap.enrollment) {
          allDropped.push(...snap.enrollment.dropped.map(d => ({ studentName: d.studentName, droppedAt: d.droppedAt })));
          allAdded.push(...snap.enrollment.added.map(a => ({ studentName: a.studentName, addedAt: a.addedAt })));
        }
        allAtRisk.push(
          ...snap.attendance.students
            .filter(s => s.riskFlag)
            .map(s => ({ studentName: s.studentName, absent: s.absent, total: s.total }))
        );
      }

      universitySystemsSnapshot = {
        pendingReviews: reviews.map(r => ({
          title: r.title,
          dueDate: r.dueDate?.toISOString() ?? null,
          status: r.status,
        })),
        enrollmentChanges: (allDropped.length > 0 || allAdded.length > 0)
          ? { dropped: allDropped, added: allAdded }
          : null,
        attendanceRiskStudents: allAtRisk,
      };
    } catch {
      // Non-critical — proceed without snapshot
    }
  }

  const activeProfile = profileId ? await getAgentProfile(profileId, user.id) : null
  if (profileId && !activeProfile) {
    throw new Error('Agent profile not found or access denied')
  }

  const effectiveConfig: AgentLoopConfig = {
    ...config,
    maxIterations: Math.min(config.maxIterations, activeProfile?.maxActionsPerRun ?? config.maxIterations),
  }

  // Build system prompt
  const systemPrompt = buildAgentSystemPrompt({
    user,
    currentPage: request.currentPage,
    toolRegistry: registry,
    universitySystemsSnapshot,
    agentProfile: activeProfile
      ? {
          name: activeProfile.name,
          systemPrompt: activeProfile.systemPrompt,
          welcomeMessage: activeProfile.welcomeMessage,
        }
      : null,
  });

  // Get role + profile + page-filtered tool definitions.
  const tools = registry.getToolDefinitionsForProfile(
    user.role,
    activeProfile?.capabilities ?? [],
    request.currentPage,
    user,
  );

  // Build the system prompt with cache_control for Anthropic prompt caching.
  // This avoids re-processing the ~4K token system prompt on every loop iteration.
  const systemWithCache: Anthropic.MessageCreateParams['system'] = [
    {
      type: 'text' as const,
      text: systemPrompt,
      cache_control: { type: 'ephemeral' as const },
    },
  ];

  // Session-scoped tool result cache (read-only tools with same args return cached result)
  const toolCache = new Map<string, ToolResult>();

  // Build conversation history for Claude (with token management)
  const messages: Anthropic.MessageParam[] = request.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  trimConversation(messages);

  let iteration = 0;

  // Emit thinking event immediately so client shows typing indicator
  emit({
    type: 'thinking',
    content: 'Sandy is preparing a response...',
  });

  while (iteration < effectiveConfig.maxIterations) {
    iteration++;

    // Trim conversation before each Claude call in case tool results bloated it
    trimConversation(messages);

    // Stream Claude's response token-by-token
    const stream = anthropic.messages.stream({
      model: AGENT_MODEL,
      max_tokens: 4096,
      system: systemWithCache,
      messages,
      tools: tools.length > 0 ? tools as Anthropic.Tool[] : undefined,
    });

    // Collect content blocks while streaming text to the client in real-time
    const contentBlocks: Anthropic.ContentBlock[] = [];
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

    stream.on('text', (text) => {
      emit({ type: 'text', content: text });
    });

    // Wait for the full response to finish (tool_use blocks arrive at the end)
    const response = await stream.finalMessage();

    // Collect all blocks (text blocks were already streamed, but we need them for history)
    for (const block of response.content) {
      contentBlocks.push(block);
      if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // If Claude is done (no tool calls), we're finished
    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break;
    }

    // Process tool calls — parallel for auto tools, sequential for confirm tools
    const toolResults: ToolResult[] = [];
    const clampedBlocks = toolUseBlocks.slice(0, effectiveConfig.maxToolCallsPerTurn);
    toolCallCount += clampedBlocks.length

    // Emit all tool_call events up front so client sees them immediately
    for (const toolUse of clampedBlocks) {
      emit({
        type: 'tool_call',
        id: toolUse.id,
        tool: toolUse.name,
        args: (toolUse.input as Record<string, unknown>) || {},
      });
    }

    // Split into auto (parallel) and confirm (sequential) groups
    const autoTools = clampedBlocks.filter(t => !registry.requiresApproval(t.name));
    const confirmTools = clampedBlocks.filter(t => registry.requiresApproval(t.name));

    // Execute all auto tools in parallel (with session cache for read-only tools)
    const autoPromises = autoTools.map(async (toolUse) => {
      const toolName = toolUse.name;
      const toolArgs = (toolUse.input as Record<string, unknown>) || {};
      const toolUseId = toolUse.id;

      // Check session cache for cacheable read-only tools
      const cacheKey = toolCacheKey(toolName, toolArgs);
      const cached = CACHEABLE_TOOLS.has(toolName) ? toolCache.get(cacheKey) : undefined;

      let result: ToolResult;
      if (cached) {
        // Return cached result with the new tool_use_id
        result = { ...cached, tool_use_id: toolUseId };
      } else {
        result = await registry.execute(toolName, toolUseId, toolArgs, user);
        // Cache cacheable tool results for the rest of this session
        if (CACHEABLE_TOOLS.has(toolName) && !result.is_error) {
          toolCache.set(cacheKey, result);
        }
      }

      const parsedResult = safeJsonParse(result.content);

      emit({
        type: 'tool_result',
        id: toolUseId,
        tool: toolName,
        result: parsedResult,
        error: result.is_error ? (parsedResult.error as string | undefined) : undefined,
      });

      logAction({
        id: generateId(),
        userId: user.id,
        sessionId,
        toolName,
        toolArgs,
        result: parsedResult,
        approved: null,
        timestamp: new Date(),
      });

      return result;
    });

    const autoResults = await Promise.all(autoPromises);
    toolResults.push(...autoResults);

    // Execute confirm tools sequentially (need approval flow)
    for (const toolUse of confirmTools) {
      const toolName = toolUse.name;
      const toolArgs = (toolUse.input as Record<string, unknown>) || {};
      const toolUseId = toolUse.id;

      const approvalId = `apr_${generateId()}`;
      const definition = registry.getDefinition(toolName);

      const approvalRequest: ApprovalRequest = {
        id: approvalId,
        toolName,
        args: toolArgs,
        description: definition?.description || toolName,
        preview: toolArgs,
        createdAt: Date.now(),
      };

      emit({
        type: 'approval_request',
        id: approvalId,
        tool: toolName,
        description: approvalRequest.description,
        preview: toolArgs,
      });

      // Track whether the timeout fired (vs a real user rejection)
      let timedOut = false;
      const decision = await Promise.race([
        approvalManager.waitForApproval(approvalRequest),
        new Promise<ApprovalDecision>((resolve) =>
          setTimeout(() => { timedOut = true; resolve('rejected'); }, effectiveConfig.approvalTimeoutMs)
        ),
      ]);

      emit({
        type: 'approval_resolved',
        id: approvalId,
        decision,
      });

      if (decision === 'rejected') {
        // Explain the timeout to the user so it doesn't silently disappear
        if (timedOut) {
          emit({
            type: 'text',
            content: `\n\n⏱ The approval for **${definition?.description || toolName}** timed out after ${Math.round(effectiveConfig.approvalTimeoutMs / 1000)} seconds. Let me know if you'd like me to try again.\n`,
          });
        }

        toolResults.push({
          tool_use_id: toolUseId,
          type: 'tool_result',
          content: JSON.stringify({
            status: 'rejected',
            reason: timedOut ? 'Approval timed out.' : 'User declined this action.',
          }),
        });

        logAction({
          id: generateId(),
          userId: user.id,
          sessionId,
          toolName,
          toolArgs,
          result: { status: 'rejected', timedOut },
          approved: false,
          timestamp: new Date(),
        });

        continue;
      }

      const result = await registry.execute(toolName, toolUseId, toolArgs, user);
      const parsedResult = safeJsonParse(result.content);

      emit({
        type: 'tool_result',
        id: toolUseId,
        tool: toolName,
        result: parsedResult,
        error: result.is_error ? (parsedResult.error as string | undefined) : undefined,
      });

      toolResults.push(result);

      logAction({
        id: generateId(),
        userId: user.id,
        sessionId,
        toolName,
        toolArgs,
        result: parsedResult,
        approved: true,
        timestamp: new Date(),
      });
    }

    // Feed tool results back to Claude for next iteration (with size caps)
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: toolResults.map((r) => {
        const capped = capToolResult(r);
        return {
          type: capped.type as 'tool_result',
          tool_use_id: capped.tool_use_id,
          content: capped.content,
          is_error: capped.is_error,
        };
      }),
    });
  }

  // If we hit max iterations, let the user know
  if (iteration >= effectiveConfig.maxIterations) {
    emit({
      type: 'text',
      content: "\n\nI've reached my processing limit for this request. Let me know if you'd like me to continue from where I left off.",
    });
  }

  return { toolCallCount }
}
