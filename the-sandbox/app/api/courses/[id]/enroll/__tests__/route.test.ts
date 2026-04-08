import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---- Mocks ----------------------------------------------------------------

const mockCourseFindUnique = vi.fn()
const mockEnrollmentUpsert = vi.fn()
const mockEnrollmentDeleteMany = vi.fn()
const mockChatGroupFindUnique = vi.fn()
const mockChatMembershipUpsert = vi.fn()

vi.mock('../../../../../lib/prisma', () => ({
  prisma: {
    course: { findUnique: (...a: unknown[]) => mockCourseFindUnique(...(a as [unknown])) },
    courseEnrollment: {
      upsert: (...a: unknown[]) => mockEnrollmentUpsert(...(a as [unknown])),
      deleteMany: (...a: unknown[]) => mockEnrollmentDeleteMany(...(a as [unknown])),
    },
    chatGroup: { findUnique: (...a: unknown[]) => mockChatGroupFindUnique(...(a as [unknown])) },
    chatMembership: { upsert: (...a: unknown[]) => mockChatMembershipUpsert(...(a as [unknown])) },
  },
}))

const mockRequireRequestUser = vi.fn()
const mockIsAuthFailure = vi.fn((result: { response?: unknown }) => 'response' in result)

vi.mock('../../../../../lib/server-auth', () => ({
  requireRequestUser: (...a: unknown[]) => mockRequireRequestUser(...(a as [unknown])),
  isAuthFailure: (result: { response?: unknown }) => mockIsAuthFailure(result),
}))

vi.mock('../../../../../lib/domain-modality-service', () => ({
  bootstrapDomainModality: vi.fn().mockResolvedValue(undefined),
}))

// ---- Import route handlers AFTER mocks ------------------------------------
import { POST, DELETE } from '../route'

// ---- Helpers ---------------------------------------------------------------

function buildRequest(method: string): NextRequest {
  const url = 'http://localhost:3000/api/courses/course-1/enroll'
  return new NextRequest(url, { method })
}

const STUDENT_USER = { id: 'stu-1', email: 'ian@uky.edu', role: 'STUDENT', name: 'Ian' }

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ---- Tests -----------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/courses/[id]/enroll', () => {
  it('rejects unauthenticated request with 401', async () => {
    const authResponse = NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    mockRequireRequestUser.mockResolvedValue({ response: authResponse })

    const res = await POST(buildRequest('POST'), paramsFor('course-1'))

    expect(res.status).toBe(401)
    expect(mockCourseFindUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when course not found', async () => {
    mockRequireRequestUser.mockResolvedValue({ user: STUDENT_USER })
    mockCourseFindUnique.mockResolvedValue(null)

    const res = await POST(buildRequest('POST'), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('Course not found')
  })

  it('enrolls successfully and returns { enrolled: true }', async () => {
    mockRequireRequestUser.mockResolvedValue({ user: STUDENT_USER })
    mockCourseFindUnique.mockResolvedValue({ id: 'course-1', courseCode: 'TEK-100' })
    mockEnrollmentUpsert.mockResolvedValue({})
    mockChatGroupFindUnique.mockResolvedValue(null)

    const res = await POST(buildRequest('POST'), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ enrolled: true })
    expect(mockEnrollmentUpsert).toHaveBeenCalledWith({
      where: { studentId_courseId: { studentId: 'stu-1', courseId: 'course-1' } },
      create: { studentId: 'stu-1', courseId: 'course-1' },
      update: {},
    })
  })

  it('auto-joins ChatGroup if one exists', async () => {
    mockRequireRequestUser.mockResolvedValue({ user: STUDENT_USER })
    mockCourseFindUnique.mockResolvedValue({ id: 'course-1', courseCode: 'TEK-100' })
    mockEnrollmentUpsert.mockResolvedValue({})
    mockChatGroupFindUnique.mockResolvedValue({ id: 'group-1' })
    mockChatMembershipUpsert.mockResolvedValue({})

    const res = await POST(buildRequest('POST'), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ enrolled: true })
    expect(mockChatMembershipUpsert).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: 'stu-1', groupId: 'group-1' } },
      update: {},
      create: { userId: 'stu-1', groupId: 'group-1', role: 'MEMBER' },
    })
  })
})

describe('DELETE /api/courses/[id]/enroll', () => {
  it('unenrolls successfully and returns { left: true }', async () => {
    mockRequireRequestUser.mockResolvedValue({ user: STUDENT_USER })
    mockEnrollmentDeleteMany.mockResolvedValue({ count: 1 })

    const res = await DELETE(buildRequest('DELETE'), paramsFor('course-1'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ left: true })
    expect(mockEnrollmentDeleteMany).toHaveBeenCalledWith({
      where: { studentId: 'stu-1', courseId: 'course-1' },
    })
  })
})
