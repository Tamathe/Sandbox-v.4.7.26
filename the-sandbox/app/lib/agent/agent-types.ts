/**
 * Sandy Universal Agent — Shared Type Definitions
 *
 * Types for the MCP-lite tool registry, agent loop, approval flow,
 * and SSE streaming protocol.
 */

// ---------------------------------------------------------------------------
// User / Auth
// ---------------------------------------------------------------------------

import type { UserRole } from '../types'
export type { UserRole } from '../types'

export interface AgentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string | null;
  isAdvisor?: boolean;
}

// ---------------------------------------------------------------------------
// Tool Definitions (MCP-lite)
// ---------------------------------------------------------------------------

/** Permission level determines approval behavior */
export type ToolPermission = 'auto' | 'confirm';

/**
 * Data reliability level — tells Claude how much to trust this tool's output.
 *
 * - 'live'      → Real-time DB / API data. Authoritative.
 * - 'seeded'    → Queries DB but data was bulk-seeded for demo. Structurally real, content synthetic.
 * - 'synthetic' → Returns hardcoded or templated data. May silently fall back to mock when real data is missing.
 * - 'navigation'→ Returns a URL or UI action, not data. Do not cite as factual.
 */
export type ToolReliability = 'live' | 'seeded' | 'synthetic' | 'navigation';

export interface ToolDefinition {
  /** Unique snake_case identifier (e.g. "get_course_roster") */
  name: string;
  /** Human-readable description for Claude's tool selection */
  description: string;
  /** Grouping category */
  category: 'academic' | 'communication' | 'calendar' | 'analytics' | 'campus' | 'content' | 'sandy' | 'tasks';
  /** auto = execute immediately; confirm = require user approval */
  permission: ToolPermission;
  /** Which roles may invoke this tool */
  roles: UserRole[];
  /** If true, users with isAdvisor=true can access this tool regardless of role */
  advisorAccess?: boolean;
  /** How much to trust this tool's output (default: 'live') */
  reliability?: ToolReliability;
  /** JSON Schema for Claude's tools parameter */
  input_schema: Record<string, unknown>;
}

/** Handler function signature — receives parsed args + authenticated user */
export type ToolHandler = (
  args: Record<string, unknown>,
  user: AgentUser,
) => Promise<Record<string, unknown>>;

/** A tool module exports definitions + handlers */
export interface ToolModule {
  tools: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
}

/** Internal registry entry (definition + handler together) */
export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

// ---------------------------------------------------------------------------
// Tool Execution
// ---------------------------------------------------------------------------

export interface ToolCallEntry {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'error' | 'awaiting_approval' | 'rejected';
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface ToolResult {
  tool_use_id: string;
  type: 'tool_result';
  content: string; // JSON-stringified result (Claude expects string content)
  is_error?: boolean;
}

// ---------------------------------------------------------------------------
// Approval Flow
// ---------------------------------------------------------------------------

export interface ApprovalRequest {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  preview: Record<string, unknown>;
  createdAt: number;
}

export type ApprovalDecision = 'approved' | 'rejected' | 'edited';

export interface ApprovalResponse {
  id: string;
  decision: ApprovalDecision;
  editedArgs?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent Loop State
// ---------------------------------------------------------------------------

export interface AgentLoopConfig {
  maxIterations: number;     // Safety cap on loop cycles (default: 10)
  maxToolCallsPerTurn: number; // Max tools per single Claude response (default: 5)
  approvalTimeoutMs: number; // How long to wait for user approval (default: 60_000)
}

export const DEFAULT_AGENT_CONFIG: AgentLoopConfig = {
  maxIterations: 10,
  maxToolCallsPerTurn: 5,
  approvalTimeoutMs: 60_000,
};

// ---------------------------------------------------------------------------
// SSE Streaming Events
// ---------------------------------------------------------------------------

export type AgentSSEEvent =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; id: string; tool: string; result: Record<string, unknown>; error?: string }
  | { type: 'approval_request'; id: string; tool: string; description: string; preview: Record<string, unknown> }
  | { type: 'approval_resolved'; id: string; decision: ApprovalDecision }
  | { type: 'text'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

// ---------------------------------------------------------------------------
// Agent Chat Request / Response
// ---------------------------------------------------------------------------

export interface AgentChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  currentPage?: string;
  sessionId?: string; // client-generated; used to correlate approval flow
  profileId?: string;
}

// ---------------------------------------------------------------------------
// Audit Log (in-memory for demo)
// ---------------------------------------------------------------------------

export interface AgentActionLog {
  id: string;
  userId: string;
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  result: Record<string, unknown>;
  approved: boolean | null; // null = auto-approved (read-only tool)
  timestamp: Date;
}
