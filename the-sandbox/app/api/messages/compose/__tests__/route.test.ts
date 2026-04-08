import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
}))

vi.mock('../../../../lib/messages/compose-service', () => ({
  composeConversation: vi.fn(),
}))

import { POST } from '../route'
import { requireRequestUser } from '../../../../lib/server-auth'
import { composeConversation } from '../../../../lib/messages/compose-service'

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-1', email: 'katie.thompson@uky.edu', name: 'Katie Thompson', role: 'EDUCATOR' }

function buildRequest(body: unknown, email?: string) {
  return new NextRequest('http://localhost:3000/api/messages/compose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-demo-user-email': email } : {}),
    },
    body: JSON.stringify(body),
  })
}

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockComposeConversation = vi.mocked(composeConversation)

function authSuccess() {
  mockRequireRequestUser.mockResolvedValue({ user: MOCK_USER as never })
}

function authFailure(status: number, message: string) {
  mockRequireRequestUser.mockResolvedValue({
    response: NextResponse.json({ error: message }, { status }),
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/messages/compose', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    authFailure(401, 'Authentication required')

    const req = buildRequest({ recipientIds: ['user-2'] })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Authentication required')
    expect(mockComposeConversation).not.toHaveBeenCalled()
  })

  it('rejects missing recipientIds with 400', async () => {
    authSuccess()

    const req = buildRequest({}, MOCK_USER.email)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('recipientIds')
  })

  it('rejects empty recipientIds array with 400', async () => {
    authSuccess()

    const req = buildRequest({ recipientIds: [] }, MOCK_USER.email)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('recipientIds')
  })

  it('creates new conversation and returns 201', async () => {
    authSuccess()

    const serviceResult = {
      groupId: 'group-1',
      isExisting: false,
    }
    mockComposeConversation.mockResolvedValue(serviceResult)

    const req = buildRequest({ recipientIds: ['user-2'] }, MOCK_USER.email)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.groupId).toBe('group-1')
    expect(json.isExisting).toBe(false)
    expect(mockComposeConversation).toHaveBeenCalledWith(MOCK_USER.id, ['user-2'])
  })

  it('returns existing conversation with 200', async () => {
    authSuccess()

    const serviceResult = {
      groupId: 'group-existing',
      isExisting: true,
    }
    mockComposeConversation.mockResolvedValue(serviceResult)

    const req = buildRequest({ recipientIds: ['user-2'] }, MOCK_USER.email)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.groupId).toBe('group-existing')
    expect(json.isExisting).toBe(true)
    expect(mockComposeConversation).toHaveBeenCalledWith(MOCK_USER.id, ['user-2'])
  })

  it('forwards service errors', async () => {
    authSuccess()

    mockComposeConversation.mockResolvedValue({ error: 'Recipient not found', status: 404 })

    const req = buildRequest({ recipientIds: ['bad-id'] }, MOCK_USER.email)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Recipient not found')
  })
})
