import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../../lib/server-auth', () => ({
  requireRequestUser: vi.fn(),
  isAuthFailure: vi.fn((r: unknown) => r != null && typeof r === 'object' && 'response' in r!),
}))

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    toolSession: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    assignment: { findMany: vi.fn().mockResolvedValue([]) },
    metricEvent: { findMany: vi.fn().mockResolvedValue([]) },
    tool: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    course: { findMany: vi.fn().mockResolvedValue([]) },
    user: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    studentObjectiveProgress: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

import { GET } from '../route'
import { requireRequestUser } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockRequireRequestUser = vi.mocked(requireRequestUser)

function buildRequest(email?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/dashboard', {
    method: 'GET',
    headers: email ? { 'x-demo-user-email': email } : {},
  })
}

function authSuccess(overrides: { id?: string; role?: string; email?: string; title?: string | null }) {
  const user = {
    id: overrides.id ?? 'user-1',
    role: overrides.role ?? 'STUDENT',
    email: overrides.email ?? 'test@uky.edu',
    title: overrides.title ?? null,
    ...({} as Record<string, unknown>),
  }
  mockRequireRequestUser.mockResolvedValue({ user } as never)
}

function authFailure() {
  const { NextResponse } = require('next/server')
  mockRequireRequestUser.mockResolvedValue({
    response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
  })
}

function resetAllMocks() {
  vi.mocked(prisma.toolSession.findMany).mockResolvedValue([])
  vi.mocked(prisma.toolSession.count).mockResolvedValue(0)
  vi.mocked(prisma.toolSession.groupBy).mockResolvedValue([] as never)
  vi.mocked(prisma.assignment.findMany).mockResolvedValue([])
  vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([])
  vi.mocked(prisma.tool.findMany).mockResolvedValue([])
  vi.mocked(prisma.tool.count).mockResolvedValue(0)
  vi.mocked(prisma.tool.groupBy).mockResolvedValue([] as never)
  vi.mocked(prisma.course.findMany).mockResolvedValue([])
  vi.mocked(prisma.user.count).mockResolvedValue(0)
  vi.mocked(prisma.user.groupBy).mockResolvedValue([] as never)
  vi.mocked(prisma.studentObjectiveProgress.findMany).mockResolvedValue([])
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    authFailure()
    const res = await GET(buildRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Authentication required')
  })

  describe('STUDENT dashboard', () => {
    it('returns role, recentSessions, and assignments', async () => {
      authSuccess({ id: 'stu-1', role: 'STUDENT', email: 'student@uky.edu' })

      const now = new Date()
      const sessionData = [
        {
          id: 'sess-1',
          startedAt: now,
          endedAt: now,
          tool: { id: 'tool-1', name: 'Quiz Bot', category: 'STUDY' },
        },
        {
          id: 'sess-2',
          startedAt: now,
          endedAt: null,
          tool: { id: 'tool-2', name: 'Flashcards', category: 'REVIEW' },
        },
      ]

      vi.mocked(prisma.toolSession.findMany).mockResolvedValue(sessionData as never)

      vi.mocked(prisma.assignment.findMany).mockResolvedValue([
        {
          id: 'asgn-1',
          title: 'Week 3 Quiz',
          tool: { id: 'tool-1', name: 'Quiz Bot' },
          course: { title: 'Intro to CS', courseCode: 'CS-101' },
          dueAt: new Date('2026-04-01'),
          rubricId: null,
        },
      ] as never)

      vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([
        { sessionId: 'sess-1', metricName: 'score', metricValue: '85', createdAt: now },
        { sessionId: 'sess-1', metricName: 'topic', metricValue: 'Arrays', createdAt: now },
      ] as never)

      const res = await GET(buildRequest('student@uky.edu'))
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.role).toBe('STUDENT')
      expect(body.recentSessions).toHaveLength(2)
      expect(body.recentSessions[0]).toMatchObject({
        toolId: 'tool-1',
        toolName: 'Quiz Bot',
        toolCategory: 'STUDY',
        score: 85,
        topic: 'Arrays',
      })
      expect(body.recentSessions[1]).toMatchObject({
        toolId: 'tool-2',
        toolName: 'Flashcards',
        score: null,
        topic: null,
      })
      expect(body.assignments).toHaveLength(1)
      expect(body.assignments[0]).toMatchObject({
        id: 'asgn-1',
        title: 'Week 3 Quiz',
        toolId: 'tool-1',
        courseCode: 'CS-101',
      })
    })
  })

  describe('EDUCATOR dashboard', () => {
    it('returns role, toolsPublished, activeStudents, recentActivity, courseHealth, atRisk', async () => {
      authSuccess({ id: 'edu-1', role: 'EDUCATOR', email: 'educator@uky.edu', title: 'Professor' })

      const now = new Date()

      // Phase 1: tools + courses
      vi.mocked(prisma.tool.findMany).mockResolvedValue([{ id: 'tool-1' }] as never)
      vi.mocked(prisma.course.findMany).mockResolvedValue([
        { id: 'course-1', courseCode: 'CS-101', title: 'Intro CS', _count: { enrollments: 30 } },
      ] as never)

      // Phase 2: toolSession.findMany is called 3 times in a single Promise.all.
      // Use mockImplementation to return data based on the call args shape.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.toolSession.findMany).mockImplementation((args: any) => {
        const a = args as { distinct?: string[]; take?: number; where?: { courseId?: unknown } }
        // activeStudentRows: has distinct: ['userId']
        if (a.distinct && (a.distinct as string[]).includes('userId')) {
          return Promise.resolve([{ userId: 'stu-1' }, { userId: 'stu-2' }]) as never
        }
        // recentSessionRows: has take: 8
        if (a.take === 8) {
          return Promise.resolve([
            { id: 'sess-10', startedAt: now, user: { name: 'Alice' }, tool: { name: 'Quiz Bot' } },
          ]) as never
        }
        // engagedUsers: has courseId in where + distinct with courseId
        if (a.distinct && (a.distinct as string[]).includes('courseId')) {
          return Promise.resolve([
            { courseId: 'course-1', userId: 'stu-1' },
            { courseId: 'course-1', userId: 'stu-2' },
          ]) as never
        }
        return Promise.resolve([]) as never
      })

      // toolSession.groupBy for avgScore by course
      vi.mocked(prisma.toolSession.groupBy).mockResolvedValue([
        { courseId: 'course-1', _avg: { score: 0.82 } },
      ] as never)

      // studentObjectiveProgress: struggling (distinct) + atRisk (include student/objective)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.studentObjectiveProgress.findMany).mockImplementation((args: any) => {
        const a = args as { distinct?: string[]; include?: unknown }
        if (a.include) {
          // atRisk records (has include: { student, objective })
          return Promise.resolve([
            {
              studentId: 'stu-3',
              courseId: 'course-1',
              masteryLevel: 'struggling',
              flaggedForReview: true,
              lastSeen: now,
              student: { name: 'Bob', email: 'bob@uky.edu' },
              objective: { title: 'Recursion' },
            },
          ]) as never
        }
        // struggling students (has distinct)
        return Promise.resolve([{ courseId: 'course-1', studentId: 'stu-3' }]) as never
      })

      // Phase 3: scores for recent sessions
      vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([
        { sessionId: 'sess-10', metricValue: '90' },
      ] as never)

      const res = await GET(buildRequest('educator@uky.edu'))
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.role).toBe('EDUCATOR')
      expect(body.title).toBe('Professor')
      expect(body.toolsPublished).toBe(1)
      expect(typeof body.activeStudents).toBe('number')
      expect(Array.isArray(body.recentActivity)).toBe(true)
      expect(Array.isArray(body.courseHealth)).toBe(true)
      expect(Array.isArray(body.atRisk)).toBe(true)
    })
  })

  describe('ADMIN dashboard (executive briefing)', () => {
    it('returns isExecutiveBriefing with platform-wide KPIs when admin has no tools', async () => {
      authSuccess({ id: 'admin-1', role: 'ADMIN', email: 'heath.price@uky.edu', title: 'Provost' })

      const now = new Date()

      // Admin has no tools → triggers executive briefing
      vi.mocked(prisma.tool.findMany).mockResolvedValue([] as never)

      // Platform-wide queries
      vi.mocked(prisma.user.count).mockResolvedValue(500)
      vi.mocked(prisma.toolSession.count).mockResolvedValue(12000)
      vi.mocked(prisma.tool.count).mockResolvedValue(42)

      vi.mocked(prisma.toolSession.findMany).mockImplementation(() =>
        Promise.resolve([
          { id: 'sess-a', startedAt: now, user: { name: 'Charlie' }, tool: { name: 'Bot', category: 'STUDY' } },
        ]) as never
      )

      vi.mocked(prisma.tool.groupBy).mockResolvedValue([
        { category: 'STUDY', _count: { _all: 20 } },
        { category: 'REVIEW', _count: { _all: 22 } },
      ] as never)

      vi.mocked(prisma.user.groupBy).mockResolvedValue([
        { studyGroup: 'control', _count: { _all: 200 } },
        { studyGroup: 'treatment', _count: { _all: 210 } },
      ] as never)

      vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([
        { sessionId: 'sess-a', metricValue: '77' },
      ] as never)

      const res = await GET(buildRequest('heath.price@uky.edu'))
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.role).toBe('ADMIN')
      expect(body.isExecutiveBriefing).toBe(true)
      expect(body.title).toBe('Provost')
      expect(body.totalStudents).toBe(500)
      expect(body.totalSessions).toBe(12000)
      expect(body.totalTools).toBe(42)
      expect(body.toolsPublished).toBe(0)
      expect(Array.isArray(body.toolsByCategory)).toBe(true)
      expect(body.toolsByCategory).toHaveLength(2)
      expect(Array.isArray(body.recentActivity)).toBe(true)
      expect(body.studyGroupSplit).toMatchObject({
        control: 200,
        treatment: 210,
      })
    })
  })
})
