/**
 * GET /api/analytics/faculty/weekly-engagement?courseId=<id>
 *
 * For each enrolled student, returns last 6 ISO weeks of:
 *   - sessions count
 *   - avgScore (mean of non-null scores that week)
 * Plus totalSessions and a trend ('up' | 'down' | 'flat') comparing
 * last 2 weeks vs prior 2 weeks by session count.
 *
 * Response:
 *   {
 *     students: {
 *       studentId: string; studentName: string; email: string;
 *       weeks: { weekLabel: string; sessions: number; avgScore: number | null }[];
 *       totalSessions: number; trend: 'up' | 'down' | 'flat'
 *     }[]
 *   }
 *   ordered by totalSessions desc
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

/** Return the ISO week-start (Monday 00:00 UTC) for a given date. */
function weekStart(d: Date): Date {
  const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const dayOfWeek = new Date(ms).getUTCDay() // 0 = Sun
  const monday = ms - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86_400_000)
  return new Date(monday)
}

/** Format a Date as "Mon DD" (e.g., "Mar 10"). */
function fmtWeek(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Fetch enrolled students with their user info
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: {
      studentId: true,
      student: { select: { id: true, name: true, email: true } },
    },
  })

  if (enrollments.length === 0) {
    return NextResponse.json({ students: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const studentIds = enrollments.map(e => e.studentId)

  // Build 6-week window (current week inclusive, back 5 more)
  const now = new Date()
  const currentWeekStart = weekStart(now)
  const weeks: Date[] = []
  for (let i = 5; i >= 0; i--) {
    weeks.push(new Date(currentWeekStart.getTime() - i * 7 * 86_400_000))
  }
  const windowStart = weeks[0]

  // Fetch all sessions in the window for these students (FERPA: exclude sensitiveSession)
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      userId: { in: studentIds },
      sensitiveSession: false,
      startedAt: { gte: windowStart },
    },
    select: {
      userId: true,
      score: true,
      startedAt: true,
    },
  })

  // Build per-student, per-week buckets
  type WeekBucket = { sessions: number; scoreSum: number; scoreCount: number }
  type StudentBuckets = Map<number, WeekBucket>

  const studentBucketMap = new Map<string, StudentBuckets>()
  for (const id of studentIds) {
    const buckets: StudentBuckets = new Map()
    for (const w of weeks) {
      buckets.set(w.getTime(), { sessions: 0, scoreSum: 0, scoreCount: 0 })
    }
    studentBucketMap.set(id, buckets)
  }

  for (const s of sessions) {
    if (!s.userId) continue
    const studentBuckets = studentBucketMap.get(s.userId)
    if (!studentBuckets) continue
    const ws = weekStart(s.startedAt)
    const bucket = studentBuckets.get(ws.getTime())
    if (!bucket) continue
    bucket.sessions++
    if (s.score !== null) {
      bucket.scoreSum += s.score
      bucket.scoreCount++
    }
  }

  const result = enrollments.map(e => {
    const buckets = studentBucketMap.get(e.studentId)!
    const weekData = weeks.map(w => {
      const b = buckets.get(w.getTime())!
      return {
        weekLabel: fmtWeek(w),
        sessions: b.sessions,
        avgScore: b.scoreCount > 0 ? Math.round((b.scoreSum / b.scoreCount) * 100) / 100 : null,
      }
    })

    const totalSessions = weekData.reduce((s, w) => s + w.sessions, 0)

    // Trend: last 2 weeks vs prior 2 weeks (by session count)
    const recent = weekData[4].sessions + weekData[5].sessions
    const prior = weekData[2].sessions + weekData[3].sessions
    const trend: 'up' | 'down' | 'flat' =
      recent > prior ? 'up' : recent < prior ? 'down' : 'flat'

    return {
      studentId: e.student.id,
      studentName: e.student.name,
      email: e.student.email,
      weeks: weekData,
      totalSessions,
      trend,
    }
  })

  result.sort((a, b) => b.totalSessions - a.totalSessions)

  return NextResponse.json({ students: result }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
