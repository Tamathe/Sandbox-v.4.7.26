import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---- Mocks ----------------------------------------------------------------

const mockFindMany = vi.fn()
const mockCourseCreate = vi.fn()
const mockChatGroupCreate = vi.fn()

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    course: { findMany: (...a: unknown[]) => mockFindMany(...a), create: (...a: unknown[]) => mockCourseCreate(...a) },
    chatGroup: { create: (...a: unknown[]) => mockChatGroupCreate(...a) },
  },
}))

const mockGetUserByEmail = vi.fn()
const mockRequireEducatorUser = vi.fn()
const mockIsAuthFailure = vi.fn()
const mockParseRequestBody = vi.fn()

vi.mock('../../../lib/server-auth', () => ({
  getUserByEmail: (...a: unknown[]) => mockGetUserByEmail(...a),
  requireEducatorUser: (...a: unknown[]) => mockRequireEducatorUser(...a),
  isAuthFailure: (...a: unknown[]) => mockIsAuthFailure(...a),
  parseRequestBody: (...a: unknown[]) => mockParseRequestBody(...a),
}))

vi.mock('../../../lib/validate', () => ({
  validateBody: (_schema: unknown, data: unknown) => ({ value: data }),
}))

vi.mock('../../../lib/schemas', () => ({
  CreateCourseSchema: {},
}))

// ---- Import route handlers AFTER mocks ------------------------------------
import { GET, POST } from '../route'

// ---- Helpers ---------------------------------------------------------------

function buildRequest(method: string, email?: string, body?: Record<string, unknown>): NextRequest {
  const url = 'http://localhost:3000/api/courses'
  const headers: Record<string, string> = {}
  if (email) headers['x-demo-user-email'] = email

  if (method === 'GET') {
    return new NextRequest(url, { method, headers })
  }

  return new NextRequest(url, {
    method,
    headers: { ...headers, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const ADMIN_USER = { id: 'admin-1', email: 'heath.price@uky.edu', role: 'ADMIN', name: 'Heath Price' }
const EDUCATOR_USER = { id: 'edu-1', email: 'heath@uky.edu', role: 'EDUCATOR', name: 'Heath' }
const STUDENT_USER = { id: 'stu-1', email: 'ian@uky.edu', role: 'STUDENT', name: 'Ian' }

const SAMPLE_COURSES = [
  { id: 'c1', courseCode: 'TEK-100', title: 'Intro to Tech', isPublic: true },
  { id: 'c2', courseCode: 'EDU-300', title: 'Advanced Tech', isPublic: false },
]

// ---- Tests -----------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/courses', () => {
  it('returns only public courses for unauthenticated requests', async () => {
    mockGetUserByEmail.mockResolvedValue(null)
    mockFindMany.mockResolvedValue([SAMPLE_COURSES[0]])

    const res = await GET(buildRequest('GET'))
    const data = await res.json()

    // email is null so getUserByEmail is never called (short-circuit in route)
    expect(mockGetUserByEmail).not.toHaveBeenCalled()
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublic: true } }),
    )
    expect(data).toEqual([SAMPLE_COURSES[0]])
  })

  it('returns all courses for ADMIN users', async () => {
    mockGetUserByEmail.mockResolvedValue(ADMIN_USER)
    mockFindMany.mockResolvedValue(SAMPLE_COURSES)

    const res = await GET(buildRequest('GET', 'heath.price@uky.edu'))
    const data = await res.json()

    expect(mockGetUserByEmail).toHaveBeenCalledWith('heath.price@uky.edu')
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    )
    expect(data).toEqual(SAMPLE_COURSES)
  })

  it('returns only own courses for EDUCATOR users', async () => {
    mockGetUserByEmail.mockResolvedValue(EDUCATOR_USER)
    mockFindMany.mockResolvedValue([SAMPLE_COURSES[0]])

    const res = await GET(buildRequest('GET', 'heath@uky.edu'))
    const data = await res.json()

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { instructorId: 'edu-1' } }),
    )
    expect(data).toEqual([SAMPLE_COURSES[0]])
  })

  it('returns public + enrolled courses for STUDENT users', async () => {
    mockGetUserByEmail.mockResolvedValue(STUDENT_USER)
    mockFindMany.mockResolvedValue(SAMPLE_COURSES)

    const res = await GET(buildRequest('GET', 'ian@uky.edu'))
    const data = await res.json()

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { isPublic: true },
            { enrollments: { some: { studentId: 'stu-1' } } },
          ],
        },
      }),
    )
    expect(data).toEqual(SAMPLE_COURSES)
  })
})

describe('POST /api/courses', () => {
  it('rejects unauthenticated request with 401', async () => {
    const authResponse = Response.json({ error: 'Unauthorized' }, { status: 401 })
    mockRequireEducatorUser.mockResolvedValue({ response: authResponse })
    mockIsAuthFailure.mockReturnValue(true)

    const res = await POST(buildRequest('POST', undefined, { courseCode: 'CS-101', title: 'Test' }))

    expect(res.status).toBe(401)
  })

  it('rejects student role with 403', async () => {
    const authResponse = Response.json({ error: 'Forbidden' }, { status: 403 })
    mockRequireEducatorUser.mockResolvedValue({ response: authResponse })
    mockIsAuthFailure.mockReturnValue(true)

    const res = await POST(buildRequest('POST', 'ian@uky.edu', { courseCode: 'CS-101', title: 'Test' }))

    expect(res.status).toBe(403)
  })

  it('creates course successfully and returns 201', async () => {
    mockRequireEducatorUser.mockResolvedValue({ user: EDUCATOR_USER })
    mockIsAuthFailure.mockReturnValue(false)
    mockParseRequestBody.mockResolvedValue({ data: { courseCode: 'cs-101', title: 'Intro CS', description: null, isPublic: true } })

    const createdCourse = { id: 'new-1', courseCode: 'CS-101', title: 'Intro CS', description: null, isPublic: true, instructorId: 'edu-1' }
    mockCourseCreate.mockResolvedValue(createdCourse)
    mockChatGroupCreate.mockResolvedValue({})

    const res = await POST(buildRequest('POST', 'heath@uky.edu', { courseCode: 'cs-101', title: 'Intro CS' }))
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data).toEqual(createdCourse)
    expect(mockCourseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseCode: 'CS-101',
          title: 'Intro CS',
          instructorId: 'edu-1',
        }),
      }),
    )
  })

  it('returns 409 when course code already exists', async () => {
    mockRequireEducatorUser.mockResolvedValue({ user: EDUCATOR_USER })
    mockIsAuthFailure.mockReturnValue(false)
    mockParseRequestBody.mockResolvedValue({ data: { courseCode: 'TEK-100', title: 'Duplicate' } })
    mockCourseCreate.mockRejectedValue(new Error('Unique constraint failed on the fields: (`courseCode`)'))

    const res = await POST(buildRequest('POST', 'heath@uky.edu', { courseCode: 'TEK-100', title: 'Duplicate' }))
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toBe('Course code already exists')
  })

  it('converts courseCode to uppercase', async () => {
    mockRequireEducatorUser.mockResolvedValue({ user: EDUCATOR_USER })
    mockIsAuthFailure.mockReturnValue(false)
    mockParseRequestBody.mockResolvedValue({ data: { courseCode: 'abc-200', title: 'Test', description: null, isPublic: true } })

    const createdCourse = { id: 'new-2', courseCode: 'ABC-200', title: 'Test' }
    mockCourseCreate.mockResolvedValue(createdCourse)
    mockChatGroupCreate.mockResolvedValue({})

    await POST(buildRequest('POST', 'heath@uky.edu', { courseCode: 'abc-200', title: 'Test' }))

    expect(mockCourseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseCode: 'ABC-200' }),
      }),
    )
  })
})
