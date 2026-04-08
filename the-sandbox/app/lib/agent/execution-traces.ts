import { Prisma } from '../../generated/prisma'
import { prisma } from '../prisma'
import { listInstitutionIntegrations } from '../integrations/registry'
import type { IntegrationSummary } from '../integrations/types'
import type { AgentChatRequest, AgentSSEEvent, AgentUser } from './agent-types'

export const SANDY_EXECUTION_STATUSES = [
  'RUNNING',
  'COMPLETED',
  'FAILED',
] as const

export type SandyExecutionStatus = (typeof SANDY_EXECUTION_STATUSES)[number]

type TraceUserSummary = {
  id: string
  name: string
  email: string
  role: string
}

export type SandyExecutionTraceSummary = {
  id: string
  sessionId: string
  status: SandyExecutionStatus
  currentPage: string | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  toolCallCount: number
  approvalCount: number
  errorCount: number
  lastUserMessage: string | null
  user: TraceUserSummary
  integrations: IntegrationSummary[]
}

export type SandyExecutionEventRecord = {
  id: string
  sequence: number
  eventType: string
  toolName: string | null
  toolCallId: string | null
  approvalId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export type SandyExecutionTraceDetail = SandyExecutionTraceSummary & {
  requestMessages: AgentChatRequest['messages']
  requestMessageCount: number
  finalResponse: string | null
  failureMessage: string | null
  modelName: string | null
  events: SandyExecutionEventRecord[]
}

type TraceListOptions = {
  limit?: number
  status?: SandyExecutionStatus
}

type TraceRecorderFinishInput = {
  status: SandyExecutionStatus
  failureMessage?: string | null
}

type TraceRecorder = {
  recordEvent: (event: AgentSSEEvent) => void
  finish: (input: TraceRecorderFinishInput) => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function isSandyExecutionStatus(value: string): value is SandyExecutionStatus {
  return SANDY_EXECUTION_STATUSES.includes(value as SandyExecutionStatus)
}

function getLastUserMessage(messages: AgentChatRequest['messages']) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role === 'user') {
      return message.content
    }
  }

  return null
}

async function captureIntegrationSnapshot() {
  try {
    return await listInstitutionIntegrations()
  } catch (error) {
    console.error('[sandy-execution-traces] Failed to capture integration snapshot:', error)
    return null
  }
}

function parseIntegrationSnapshot(value: unknown): IntegrationSummary[] {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is IntegrationSummary => {
    return isRecord(entry) && typeof entry.id === 'string' && typeof entry.key === 'string'
  })
}

function parseRequestMessages(value: unknown): AgentChatRequest['messages'] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    if (entry.role !== 'user' && entry.role !== 'assistant') return []
    if (typeof entry.content !== 'string') return []

    return [{ role: entry.role, content: entry.content }]
  })
}

function parseEventPayload(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null
  return value
}

function mapTraceSummary(trace: {
  id: string
  sessionId: string
  status: string
  currentPage: string | null
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  toolCallCount: number
  approvalCount: number
  errorCount: number
  lastUserMessage: string | null
  integrationSnapshot: unknown
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}): SandyExecutionTraceSummary {
  return {
    id: trace.id,
    sessionId: trace.sessionId,
    status: isSandyExecutionStatus(trace.status) ? trace.status : 'FAILED',
    currentPage: trace.currentPage,
    startedAt: trace.startedAt.toISOString(),
    completedAt: trace.completedAt?.toISOString() ?? null,
    durationMs: trace.durationMs,
    toolCallCount: trace.toolCallCount,
    approvalCount: trace.approvalCount,
    errorCount: trace.errorCount,
    lastUserMessage: trace.lastUserMessage,
    user: {
      id: trace.user.id,
      name: trace.user.name,
      email: trace.user.email,
      role: trace.user.role,
    },
    integrations: parseIntegrationSnapshot(trace.integrationSnapshot),
  }
}

function buildEventPayload(event: AgentSSEEvent) {
  switch (event.type) {
    case 'thinking':
      return { content: event.content }
    case 'tool_call':
      return { args: event.args }
    case 'tool_result':
      return {
        result: event.result,
        error: event.error ?? null,
      }
    case 'approval_request':
      return {
        description: event.description,
        preview: event.preview,
      }
    case 'approval_resolved':
      return { decision: event.decision }
    case 'text':
      return { content: event.content }
    case 'error':
      return { message: event.message }
    case 'done':
      return null
  }
}

function buildEventRecord(
  traceId: string,
  sequence: number,
  event: AgentSSEEvent,
) {
  const payload = buildEventPayload(event)

  return {
    traceId,
    sequence,
    eventType: event.type,
    toolName:
      event.type === 'tool_call' ||
      event.type === 'tool_result' ||
      event.type === 'approval_request'
        ? event.tool
        : null,
    toolCallId:
      event.type === 'tool_call' || event.type === 'tool_result'
        ? event.id
        : null,
    approvalId:
      event.type === 'approval_request' || event.type === 'approval_resolved'
        ? event.id
        : null,
    payload: payload === null ? Prisma.DbNull : asJsonValue(payload),
  }
}

class PrismaTraceRecorder implements TraceRecorder {
  private finalResponse = ''
  private sequence = 0
  private toolCallCount = 0
  private approvalCount = 0
  private errorCount = 0
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly traceId: string,
    private readonly startedAt = new Date(),
  ) {}

  recordEvent(event: AgentSSEEvent) {
    if (event.type === 'text') {
      this.finalResponse += event.content
    }

    if (event.type === 'tool_call') {
      this.toolCallCount += 1
    }

    if (event.type === 'approval_request') {
      this.approvalCount += 1
    }

    if (event.type === 'error' || (event.type === 'tool_result' && Boolean(event.error))) {
      this.errorCount += 1
    }

    const eventRecord = buildEventRecord(this.traceId, this.sequence, event)
    this.sequence += 1

    this.queue = this.queue
      .then(async () => {
        await prisma.sandyExecutionEvent.create({
          data: eventRecord,
        })
      })
      .catch((error) => {
        console.error('[sandy-execution-traces] Failed to persist event:', error)
      })
  }

  async finish(input: TraceRecorderFinishInput) {
    await this.queue

    const completedAt = new Date()

    try {
      await prisma.sandyExecutionTrace.update({
        where: { id: this.traceId },
        data: {
          status: input.status,
          toolCallCount: this.toolCallCount,
          approvalCount: this.approvalCount,
          errorCount: this.errorCount,
          finalResponse: this.finalResponse || null,
          failureMessage: input.failureMessage ?? null,
          lastEventAt: completedAt,
          completedAt,
          durationMs: Math.max(completedAt.getTime() - this.startedAt.getTime(), 0),
        },
      })
    } catch (error) {
      console.error('[sandy-execution-traces] Failed to finalize trace:', error)
    }
  }
}

const noopTraceRecorder: TraceRecorder = {
  recordEvent() {},
  async finish() {},
}

export async function createSandyExecutionRecorder(params: {
  sessionId: string
  request: AgentChatRequest
  user: AgentUser
  modelName: string
}): Promise<TraceRecorder> {
  const { sessionId, request, user, modelName } = params

  try {
    const integrationSnapshot = await captureIntegrationSnapshot()
    const trace = await prisma.sandyExecutionTrace.create({
      data: {
        sessionId,
        userId: user.id,
        userRole: user.role,
        currentPage: request.currentPage ?? null,
        requestMessages: asJsonValue(request.messages),
        requestMessageCount: request.messages.length,
        lastUserMessage: getLastUserMessage(request.messages),
        integrationSnapshot: integrationSnapshot
          ? asJsonValue(integrationSnapshot)
          : Prisma.DbNull,
        modelName,
      },
      select: { id: true },
    })

    return new PrismaTraceRecorder(trace.id)
  } catch (error) {
    console.error('[sandy-execution-traces] Failed to initialize trace recorder:', error)
    return noopTraceRecorder
  }
}

export async function listSandyExecutionTraces(options: TraceListOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)
  const traces = await prisma.sandyExecutionTrace.findMany({
    where: options.status ? { status: options.status } : undefined,
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      status: true,
      currentPage: true,
      startedAt: true,
      completedAt: true,
      durationMs: true,
      toolCallCount: true,
      approvalCount: true,
      errorCount: true,
      lastUserMessage: true,
      integrationSnapshot: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  return traces.map(mapTraceSummary)
}

export async function getSandyExecutionTraceDetail(id: string) {
  const trace = await prisma.sandyExecutionTrace.findUnique({
    where: { id },
    select: {
      id: true,
      sessionId: true,
      status: true,
      currentPage: true,
      startedAt: true,
      completedAt: true,
      durationMs: true,
      toolCallCount: true,
      approvalCount: true,
      errorCount: true,
      lastUserMessage: true,
      integrationSnapshot: true,
      requestMessages: true,
      requestMessageCount: true,
      finalResponse: true,
      failureMessage: true,
      modelName: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      events: {
        orderBy: { sequence: 'asc' },
        select: {
          id: true,
          sequence: true,
          eventType: true,
          toolName: true,
          toolCallId: true,
          approvalId: true,
          payload: true,
          createdAt: true,
        },
      },
    },
  })

  if (!trace) return null

  return {
    ...mapTraceSummary(trace),
    requestMessages: parseRequestMessages(trace.requestMessages),
    requestMessageCount: trace.requestMessageCount,
    finalResponse: trace.finalResponse,
    failureMessage: trace.failureMessage,
    modelName: trace.modelName,
    events: trace.events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      eventType: event.eventType,
      toolName: event.toolName,
      toolCallId: event.toolCallId,
      approvalId: event.approvalId,
      payload: parseEventPayload(event.payload),
      createdAt: event.createdAt.toISOString(),
    })),
  } satisfies SandyExecutionTraceDetail
}
