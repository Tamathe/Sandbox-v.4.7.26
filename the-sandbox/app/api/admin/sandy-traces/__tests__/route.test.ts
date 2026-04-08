import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../../lib/server-auth', () => ({
  requireAdminUser: vi.fn(),
  isAuthFailure: vi.fn(
    (value: unknown) =>
      value != null && typeof value === 'object' && 'response' in value,
  ),
}))

vi.mock('../../../../lib/agent/execution-traces', () => ({
  SANDY_EXECUTION_STATUSES: ['RUNNING', 'COMPLETED', 'FAILED'],
  listSandyExecutionTraces: vi.fn(),
  getSandyExecutionTraceDetail: vi.fn(),
}))

import { GET as listRoute } from '../route'
import { GET as detailRoute } from '../[id]/route'
import { requireAdminUser } from '../../../../lib/server-auth'
import {
  getSandyExecutionTraceDetail,
  listSandyExecutionTraces,
} from '../../../../lib/agent/execution-traces'

const mockRequireAdminUser = vi.mocked(requireAdminUser)
const mockListSandyExecutionTraces = vi.mocked(listSandyExecutionTraces)
const mockGetSandyExecutionTraceDetail = vi.mocked(getSandyExecutionTraceDetail)

function buildRequest(
  path: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return new NextRequest(`http://localhost:3000${path}`, init)
}

function authSuccess() {
  mockRequireAdminUser.mockResolvedValue({
    user: {
      id: 'admin-1',
      email: 'admin@uky.edu',
      role: 'ADMIN',
    },
  } as never)
}

function authFailure(status = 403) {
  mockRequireAdminUser.mockResolvedValue({
    response: NextResponse.json({ error: 'Admin access required' }, { status }),
  } as never)
}

describe('admin Sandy trace routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists Sandy traces for admins', async () => {
    authSuccess()
    mockListSandyExecutionTraces.mockResolvedValue([
      {
        id: 'trace-1',
        sessionId: 'ses_123',
        status: 'COMPLETED',
        currentPage: '/faculty',
        startedAt: '2026-03-25T10:00:00.000Z',
        completedAt: '2026-03-25T10:00:08.000Z',
        durationMs: 8000,
        toolCallCount: 2,
        approvalCount: 1,
        errorCount: 0,
        lastUserMessage: 'Draft a reply to the dean.',
        integrations: [],
        user: {
          id: 'user-1',
          name: 'Alex Admin',
          email: 'alex@uky.edu',
          role: 'ADMIN',
        },
      },
    ] as never)

    const response = await listRoute(
      buildRequest('/api/admin/sandy-traces?status=COMPLETED&limit=5'),
    )

    expect(response.status).toBe(200)
    expect(mockListSandyExecutionTraces).toHaveBeenCalledWith({
      limit: 5,
      status: 'COMPLETED',
    })

    const body = await response.json()
    expect(body.traces).toHaveLength(1)
    expect(body.traces[0].sessionId).toBe('ses_123')
  })

  it('rejects invalid status filters', async () => {
    authSuccess()

    const response = await listRoute(
      buildRequest('/api/admin/sandy-traces?status=BOGUS'),
    )

    expect(response.status).toBe(400)
    expect(mockListSandyExecutionTraces).not.toHaveBeenCalled()
  })

  it('passes through admin auth failures on the list route', async () => {
    authFailure()

    const response = await listRoute(buildRequest('/api/admin/sandy-traces'))
    expect(response.status).toBe(403)
  })

  it('returns a trace detail payload for admins', async () => {
    authSuccess()
    mockGetSandyExecutionTraceDetail.mockResolvedValue({
      id: 'trace-1',
      sessionId: 'ses_123',
      status: 'FAILED',
      currentPage: '/messages',
      startedAt: '2026-03-25T10:00:00.000Z',
      completedAt: '2026-03-25T10:00:03.000Z',
      durationMs: 3000,
      toolCallCount: 1,
      approvalCount: 0,
      errorCount: 1,
      lastUserMessage: 'Check my inbox.',
      integrations: [],
      user: {
        id: 'user-1',
        name: 'Alex Admin',
        email: 'alex@uky.edu',
        role: 'ADMIN',
      },
      requestMessages: [{ role: 'user', content: 'Check my inbox.' }],
      requestMessageCount: 1,
      finalResponse: null,
      failureMessage: 'Anthropic unavailable',
      modelName: 'claude-sonnet-4-6',
      events: [],
    } as never)

    const response = await detailRoute(
      buildRequest('/api/admin/sandy-traces/trace-1'),
      { params: Promise.resolve({ id: 'trace-1' }) },
    )

    expect(response.status).toBe(200)
    expect(mockGetSandyExecutionTraceDetail).toHaveBeenCalledWith('trace-1')
  })

  it('returns 404 when a trace is missing', async () => {
    authSuccess()
    mockGetSandyExecutionTraceDetail.mockResolvedValue(null)

    const response = await detailRoute(
      buildRequest('/api/admin/sandy-traces/missing'),
      { params: Promise.resolve({ id: 'missing' }) },
    )

    expect(response.status).toBe(404)
  })
})
