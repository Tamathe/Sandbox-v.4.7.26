import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../../../lib/prisma', () => ({
  prisma: {
    tool: { findUnique: vi.fn() },
    upvote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('../../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
}))

import { POST } from '../route'
import { requireRequestUser } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockRequireRequestUser = vi.mocked(requireRequestUser)

function buildRequest(email?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/tools/tool-1/upvote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-demo-user-email': email } : {}),
    },
  })
}

const routeParams = Promise.resolve({ id: 'tool-1' })

function authSuccess(overrides?: { id?: string; role?: string }) {
  const user = {
    id: overrides?.id ?? 'user-1',
    role: overrides?.role ?? 'STUDENT',
    email: 'student@uky.edu',
  }
  mockRequireRequestUser.mockResolvedValue({ user } as never)
}

function authFailure() {
  const { NextResponse } = require('next/server')
  mockRequireRequestUser.mockResolvedValue({
    response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/tools/[id]/upvote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds upvote when not yet upvoted', async () => {
    authSuccess({ id: 'user-1' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue({ id: 'tool-1' } as never)
    vi.mocked(prisma.upvote.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.upvote.create).mockResolvedValue({} as never)
    vi.mocked(prisma.upvote.count).mockResolvedValue(10)

    const res = await POST(buildRequest('student@uky.edu'), { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.upvoted).toBe(true)
    expect(body.count).toBe(10)
  })

  it('removes upvote when already upvoted', async () => {
    authSuccess({ id: 'user-1' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue({ id: 'tool-1' } as never)
    vi.mocked(prisma.upvote.findUnique).mockResolvedValue({ id: 'up-1' } as never)
    vi.mocked(prisma.upvote.delete).mockResolvedValue({} as never)
    vi.mocked(prisma.upvote.count).mockResolvedValue(7)

    const res = await POST(buildRequest('student@uky.edu'), { params: routeParams })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.upvoted).toBe(false)
    expect(body.count).toBe(7)
  })

  it('returns 404 when tool does not exist', async () => {
    authSuccess({ id: 'user-1' })

    vi.mocked(prisma.tool.findUnique).mockResolvedValue(null)

    const res = await POST(buildRequest('student@uky.edu'), { params: routeParams })
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('Tool not found')
  })

  it('rejects unauthenticated request with 401', async () => {
    authFailure()

    const res = await POST(buildRequest(), { params: routeParams })
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Authentication required')
  })
})
