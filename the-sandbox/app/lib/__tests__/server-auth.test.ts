import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildRequest, MOCK_USERS } from '../../__tests__/helpers'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    course: { findUnique: vi.fn() },
  },
}))

// Stub lru-cache so the user cache doesn't interfere between tests
vi.mock('lru-cache', () => {
  class FakeLRUCache {
    get() { return undefined }
    set() {}
    delete() {}
  }
  return { LRUCache: FakeLRUCache }
})

import {
  requireRequestUser,
  requireAdminUser,
  requireEducatorUser,
  requireCourseOwner,
  verifyCronSecret,
  isAuthFailure,
} from '../server-auth'
import { prisma } from '../prisma'

// ── Typed mock helpers ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockCourseFindUnique = vi.mocked(prisma.course.findUnique)

// Build a full User-like object from the MOCK_USERS constants
function fullUser(base: typeof MOCK_USERS[keyof typeof MOCK_USERS], overrides: Record<string, unknown> = {}) {
  return {
    ...base,
    department: null,
    college: null,
    avatarUrl: null,
    bio: null,
    personalContext: null,
    suspendedAt: null,
    suspendedReason: null,
    ...overrides,
  } as never
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── requireRequestUser ───────────────────────────────────────────────────────

describe('requireRequestUser', () => {
  it('returns user when valid email header is provided', async () => {
    const user = fullUser(MOCK_USERS.educator)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/test', { email: MOCK_USERS.educator.email })
    const result = await requireRequestUser(req)

    expect(isAuthFailure(result)).toBe(false)
    expect((result as { user: unknown }).user).toBe(user)
  })

  it('returns 401 when no email header', async () => {
    const req = buildRequest('/api/test')
    const result = await requireRequestUser(req)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Authentication required')
  })

  it('returns 401 when user not found in DB', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const req = buildRequest('/api/test', { email: 'nobody@uky.edu' })
    const result = await requireRequestUser(req)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is suspended', async () => {
    const user = fullUser(MOCK_USERS.student, {
      suspended: true,
      suspendedReason: 'Policy violation',
    })
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/test', { email: MOCK_USERS.student.email })
    const result = await requireRequestUser(req)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.suspended).toBe(true)
  })

  it('allows suspended user when allowSuspended is true', async () => {
    const user = fullUser(MOCK_USERS.student, { suspended: true })
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/test', { email: MOCK_USERS.student.email })
    const result = await requireRequestUser(req, { allowSuspended: true })

    expect(isAuthFailure(result)).toBe(false)
  })
})

// ── requireAdminUser ─────────────────────────────────────────────────────────

describe('requireAdminUser', () => {
  it('returns user when role is ADMIN', async () => {
    const user = fullUser(MOCK_USERS.admin)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/admin/test', { email: MOCK_USERS.admin.email })
    const result = await requireAdminUser(req)

    expect(isAuthFailure(result)).toBe(false)
    expect((result as { user: unknown }).user).toBe(user)
  })

  it('returns 403 when role is EDUCATOR', async () => {
    const user = fullUser(MOCK_USERS.educator)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/admin/test', { email: MOCK_USERS.educator.email })
    const result = await requireAdminUser(req)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Admin access required')
  })

  it('returns 403 when role is STUDENT', async () => {
    const user = fullUser(MOCK_USERS.student)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/admin/test', { email: MOCK_USERS.student.email })
    const result = await requireAdminUser(req)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(403)
  })
})

// ── requireEducatorUser ──────────────────────────────────────────────────────

describe('requireEducatorUser', () => {
  it('returns user when role is EDUCATOR', async () => {
    const user = fullUser(MOCK_USERS.educator)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/builder/test', { email: MOCK_USERS.educator.email })
    const result = await requireEducatorUser(req)

    expect(isAuthFailure(result)).toBe(false)
    expect((result as { user: unknown }).user).toBe(user)
  })

  it('returns user when role is ADMIN (admins can act as educators)', async () => {
    const user = fullUser(MOCK_USERS.admin)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/builder/test', { email: MOCK_USERS.admin.email })
    const result = await requireEducatorUser(req)

    expect(isAuthFailure(result)).toBe(false)
    expect((result as { user: unknown }).user).toBe(user)
  })

  it('returns 403 when role is STUDENT', async () => {
    const user = fullUser(MOCK_USERS.student)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/builder/test', { email: MOCK_USERS.student.email })
    const result = await requireEducatorUser(req)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Educator access required')
  })
})

// ── requireCourseOwner ───────────────────────────────────────────────────────

describe('requireCourseOwner', () => {
  const COURSE_ID = 'course-abc'

  it('returns user when user is the course instructor', async () => {
    const user = fullUser(MOCK_USERS.educator)
    mockUserFindUnique.mockResolvedValue(user)
    mockCourseFindUnique.mockResolvedValue({ instructorId: MOCK_USERS.educator.id } as never)

    const req = buildRequest('/api/courses/test', { email: MOCK_USERS.educator.email })
    const result = await requireCourseOwner(req, COURSE_ID)

    expect(isAuthFailure(result)).toBe(false)
    expect((result as { user: unknown }).user).toBe(user)
  })

  it('returns user when user is ADMIN (bypass ownership check)', async () => {
    const user = fullUser(MOCK_USERS.admin)
    mockUserFindUnique.mockResolvedValue(user)

    const req = buildRequest('/api/courses/test', { email: MOCK_USERS.admin.email })
    const result = await requireCourseOwner(req, COURSE_ID)

    expect(isAuthFailure(result)).toBe(false)
    // Should NOT have queried the course at all — admin bypasses
    expect(mockCourseFindUnique).not.toHaveBeenCalled()
  })

  it('returns 403 when different user owns the course', async () => {
    const user = fullUser(MOCK_USERS.educator)
    mockUserFindUnique.mockResolvedValue(user)
    mockCourseFindUnique.mockResolvedValue({ instructorId: 'someone-else' } as never)

    const req = buildRequest('/api/courses/test', { email: MOCK_USERS.educator.email })
    const result = await requireCourseOwner(req, COURSE_ID)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 404 when course does not exist', async () => {
    const user = fullUser(MOCK_USERS.educator)
    mockUserFindUnique.mockResolvedValue(user)
    mockCourseFindUnique.mockResolvedValue(null)

    const req = buildRequest('/api/courses/test', { email: MOCK_USERS.educator.email })
    const result = await requireCourseOwner(req, COURSE_ID)

    expect(isAuthFailure(result)).toBe(true)
    const res = (result as { response: Response }).response
    expect(res.status).toBe(404)
  })
})

// ── verifyCronSecret ─────────────────────────────────────────────────────────

describe('verifyCronSecret', () => {
  const CRON_SECRET = 'super-secret-cron-token'

  it('returns null (success) when Bearer token matches CRON_SECRET', () => {
    process.env.CRON_SECRET = CRON_SECRET
    const req = buildRequest('/api/cron/test', {
      method: 'POST',
    })
    // Manually set auth header since buildRequest doesn't support it
    const reqWithAuth = new Request('http://localhost:3000/api/cron/test', {
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    })
    const { NextRequest } = require('next/server')
    const nextReq = new NextRequest(reqWithAuth)

    const result = verifyCronSecret(nextReq)
    expect(result).toBeNull()
  })

  it('returns 401 when wrong token', () => {
    process.env.CRON_SECRET = CRON_SECRET
    const { NextRequest } = require('next/server')
    const reqWithAuth = new NextRequest('http://localhost:3000/api/cron/test', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-token' },
    })

    const result = verifyCronSecret(reqWithAuth)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('returns 401 when no Authorization header', () => {
    process.env.CRON_SECRET = CRON_SECRET
    const { NextRequest } = require('next/server')
    const reqWithAuth = new NextRequest('http://localhost:3000/api/cron/test', {
      method: 'POST',
    })

    const result = verifyCronSecret(reqWithAuth)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('returns 403 when CRON_SECRET env var is not set', () => {
    delete process.env.CRON_SECRET
    const { NextRequest } = require('next/server')
    const reqWithAuth = new NextRequest('http://localhost:3000/api/cron/test', {
      method: 'POST',
      headers: { authorization: 'Bearer anything' },
    })

    const result = verifyCronSecret(reqWithAuth)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })
})
