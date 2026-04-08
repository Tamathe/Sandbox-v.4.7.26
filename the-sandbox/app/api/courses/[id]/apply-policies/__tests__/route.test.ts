import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  requireCourseOwner: vi.fn(),
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
}))

vi.mock('../../../../../lib/prisma', () => {
  const transaction = vi.fn()
  return {
    prisma: {
      $transaction: transaction,
      coursePolicy: { deleteMany: vi.fn(), createManyAndReturn: vi.fn(), findMany: vi.fn() },
      gradingWeight: { deleteMany: vi.fn(), createManyAndReturn: vi.fn(), findMany: vi.fn() },
    },
  }
})

import { GET, POST } from '../route'
import { requireRequestUser, requireCourseOwner } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

const COURSE_ID = 'course-123'
const OWNER_EMAIL = 'katie.thompson@uky.edu'

function buildRequest(body: unknown, email?: string): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/courses/course-123/apply-policies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-demo-user-email': email } : {}),
    },
    body: JSON.stringify(body),
  })
  return req
}

const params = Promise.resolve({ id: COURSE_ID })

function validBody(overrides?: {
  policies?: unknown[]
  gradingWeights?: unknown[]
}) {
  return {
    policies: overrides?.policies ?? [
      { category: 'late', title: 'Late Work', content: 'Minus 10% per day' },
      { category: 'grading', title: 'Grading Scale', content: 'A=90+, B=80+' },
    ],
    gradingWeights: overrides?.gradingWeights ?? [
      { category: 'Exams', weight: 0.4, description: 'Midterm + Final' },
      { category: 'Homework', weight: 0.6, description: null },
    ],
  }
}

// ── Helpers for mocking auth ─────────────────────────────────────────────────

const mockRequireCourseOwner = vi.mocked(requireCourseOwner)
const mockTransaction = vi.mocked(prisma.$transaction)

function authSuccess() {
  mockRequireCourseOwner.mockResolvedValue({
    user: { id: 'user-1', email: OWNER_EMAIL, role: 'EDUCATOR' } as never,
  })
}

function authFailure(status: number, message: string) {
  const { NextResponse } = require('next/server')
  mockRequireCourseOwner.mockResolvedValue({
    response: NextResponse.json({ error: message }, { status }),
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/courses/[id]/apply-policies', () => {
  // ── 1. Auth guard tests ──────────────────────────────────────────────────

  describe('auth guards', () => {
    it('rejects request with no x-demo-user-email header → 401', async () => {
      authFailure(401, 'Authentication required')
      const req = buildRequest(validBody())
      const res = await POST(req, { params })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Authentication required')
    })

    it('rejects request from non-owner → 403', async () => {
      authFailure(403, 'Forbidden')
      const req = buildRequest(validBody(), 'someone.else@uky.edu')
      const res = await POST(req, { params })

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  // ── 2. Zod validation tests ──────────────────────────────────────────────

  describe('Zod validation', () => {
    beforeEach(() => authSuccess())

    it('rejects invalid policy category → 400', async () => {
      const body = validBody({
        policies: [{ category: 'foo', title: 'Bad', content: 'Invalid category' }],
      })
      const req = buildRequest(body, OWNER_EMAIL)
      const res = await POST(req, { params })

      expect(res.status).toBe(400)
    })

    it('rejects grading weight > 1 → 400', async () => {
      const body = validBody({
        gradingWeights: [{ category: 'Exams', weight: 1.5, description: null }],
      })
      const req = buildRequest(body, OWNER_EMAIL)
      const res = await POST(req, { params })

      expect(res.status).toBe(400)
    })

    it('rejects negative grading weight → 400', async () => {
      const body = validBody({
        gradingWeights: [{ category: 'Exams', weight: -0.1, description: null }],
      })
      const req = buildRequest(body, OWNER_EMAIL)
      const res = await POST(req, { params })

      expect(res.status).toBe(400)
    })

    it('rejects missing required fields (title, content, category) → 400', async () => {
      const body = validBody({
        policies: [{ content: 'No title or category' }],
      })
      const req = buildRequest(body, OWNER_EMAIL)
      const res = await POST(req, { params })

      expect(res.status).toBe(400)
    })
  })

  // ── 3. Successful upsert tests ───────────────────────────────────────────

  describe('successful upsert', () => {
    beforeEach(() => authSuccess())

    it('returns applied:true with correct counts', async () => {
      const body = validBody()
      mockTransaction.mockResolvedValue([
        { count: 0 },  // deleteMany policies
        { count: 0 },  // deleteMany weights
        [{ id: 'pol-0', courseId: COURSE_ID }, { id: 'pol-1', courseId: COURSE_ID }],
        [{ id: 'wgt-0', courseId: COURSE_ID }, { id: 'wgt-1', courseId: COURSE_ID }],
      ])

      const req = buildRequest(body, OWNER_EMAIL)
      const res = await POST(req, { params })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        applied: true,
        policiesCount: 2,
        gradingWeightsCount: 2,
      })
    })

    it('second call replaces old records (upsert pattern)', async () => {
      // First call: 2 policies, 2 weights
      const body1 = validBody()
      mockTransaction.mockResolvedValueOnce([
        { count: 0 },
        { count: 0 },
        [{ id: 'pol-0', courseId: COURSE_ID }, { id: 'pol-1', courseId: COURSE_ID }],
        [{ id: 'wgt-0', courseId: COURSE_ID }, { id: 'wgt-1', courseId: COURSE_ID }],
      ])

      const req1 = buildRequest(body1, OWNER_EMAIL)
      await POST(req1, { params })

      // Second call: 1 policy, 1 weight (different data)
      const body2 = validBody({
        policies: [{ category: 'attendance', title: 'Attendance', content: 'Must attend' }],
        gradingWeights: [{ category: 'Final', weight: 1.0, description: 'All-or-nothing' }],
      })
      mockTransaction.mockResolvedValueOnce([
        { count: 2 },  // deleteMany removes old 2 policies
        { count: 2 },  // deleteMany removes old 2 weights
        [{ id: 'pol-new', courseId: COURSE_ID }],
        [{ id: 'wgt-new', courseId: COURSE_ID }],
      ])

      const req2 = buildRequest(body2, OWNER_EMAIL)
      const res2 = await POST(req2, { params })

      expect(res2.status).toBe(200)
      const json2 = await res2.json()
      expect(json2).toEqual({
        applied: true,
        policiesCount: 1,
        gradingWeightsCount: 1,
      })

      // Verify transaction was called twice
      expect(mockTransaction).toHaveBeenCalledTimes(2)
    })
  })

  // ── 4. Empty-array edge case ─────────────────────────────────────────────

  describe('empty-array edge case', () => {
    beforeEach(() => authSuccess())

    it('accepts empty arrays and returns counts of 0', async () => {
      const body = { policies: [], gradingWeights: [] }
      mockTransaction.mockResolvedValue([
        { count: 3 },  // deleteMany clears existing policies
        { count: 2 },  // deleteMany clears existing weights
        [],             // no new policies created
        [],             // no new weights created
      ])

      const req = buildRequest(body, OWNER_EMAIL)
      const res = await POST(req, { params })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        applied: true,
        policiesCount: 0,
        gradingWeightsCount: 0,
      })
    })
  })
})

// ── GET tests ──────────────────────────────────────────────────────────────────

const mockRequireRequestUser = vi.mocked(requireRequestUser)
const mockPolicyFindMany = vi.mocked(prisma.coursePolicy.findMany)
const mockWeightFindMany = vi.mocked(prisma.gradingWeight.findMany)

function buildGetRequest(email?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/courses/course-123/apply-policies', {
    method: 'GET',
    headers: email ? { 'x-demo-user-email': email } : {},
  })
}

function getAuthSuccess() {
  mockRequireRequestUser.mockResolvedValue({
    user: { id: 'user-1', email: 'tiana.the.student@uky.edu', role: 'STUDENT' } as never,
  })
}

function getAuthFailure(status: number, message: string) {
  const { NextResponse } = require('next/server')
  mockRequireRequestUser.mockResolvedValue({
    response: NextResponse.json({ error: message }, { status }),
  })
}

describe('GET /api/courses/[id]/apply-policies', () => {
  it('rejects unauthenticated request → 401', async () => {
    getAuthFailure(401, 'Authentication required')
    const req = buildGetRequest()
    const res = await GET(req, { params })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Authentication required')
  })

  it('returns policies and grading weights for authenticated user', async () => {
    getAuthSuccess()

    const fakePolicies = [
      { id: 'p1', courseId: COURSE_ID, policyType: 'late', title: 'Late Work', content: '-10%/day', source: 'syllabus', createdAt: new Date() },
      { id: 'p2', courseId: COURSE_ID, policyType: 'grading', title: 'Grading', content: 'A=90+', source: 'syllabus', createdAt: new Date() },
    ]
    const fakeWeights = [
      { id: 'w1', courseId: COURSE_ID, category: 'Exams', weight: 0.5, description: 'Final', source: 'syllabus', createdAt: new Date() },
    ]

    mockPolicyFindMany.mockResolvedValue(fakePolicies as never)
    mockWeightFindMany.mockResolvedValue(fakeWeights as never)

    const req = buildGetRequest('tiana.the.student@uky.edu')
    const res = await GET(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.policies).toHaveLength(2)
    expect(json.gradingWeights).toHaveLength(1)
    expect(json.policies[0].title).toBe('Late Work')
    expect(json.gradingWeights[0].category).toBe('Exams')
  })

  it('returns empty arrays for course with no policies', async () => {
    getAuthSuccess()
    mockPolicyFindMany.mockResolvedValue([] as never)
    mockWeightFindMany.mockResolvedValue([] as never)

    const req = buildGetRequest('tiana.the.student@uky.edu')
    const res = await GET(req, { params })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ policies: [], gradingWeights: [] })
  })
})
