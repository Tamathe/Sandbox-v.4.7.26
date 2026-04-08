/**
 * GET /api/analytics/student/concept-velocity?userId=<id>
 *
 * Returns weekly concept velocity: avg Bloom level + new concept count
 * per week × course for the last 8 weeks.
 *
 * Auth: requireRequestUser.
 *   - STUDENT: may only fetch their own data (userId must match auth user).
 *   - EDUCATOR / ADMIN: may fetch any userId.
 * Zero-activity weeks are included (avgBloom: null, newConcepts: 0).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { subWeeks, startOfWeek, addWeeks, format } from 'date-fns'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (user.role === 'STUDENT' && user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const eightWeeksAgo = subWeeks(weekStart, 7)

  const states = await prisma.conceptState.findMany({
    where: {
      userId,
      updatedAt: { gte: eightWeeksAgo },
    },
    select: {
      courseId: true,
      conceptSlug: true,
      bloomHighWater: true,
      createdAt: true,
      updatedAt: true,
      course: { select: { courseCode: true } },
    },
  })

  // Build 8 week buckets (Mon–Sun)
  const buckets: { start: Date; end: Date; label: string }[] = []
  for (let i = 0; i < 8; i++) {
    const start = addWeeks(eightWeeksAgo, i)
    const end = addWeeks(start, 1)
    buckets.push({ start, end, label: format(start, 'MMM dd') })
  }

  const courseIds = [...new Set(states.map(s => s.courseId))]

  type SeriesEntry = {
    weekLabel: string
    avgBloom: number | null
    newConcepts: number
    courseCode: string
  }

  const series: SeriesEntry[] = []

  if (courseIds.length === 0) {
    // No data — return zero-filled weeks with no course prefix
    for (const bucket of buckets) {
      series.push({ weekLabel: bucket.label, avgBloom: null, newConcepts: 0, courseCode: '' })
    }
  } else {
    for (const courseId of courseIds) {
      const courseStates = states.filter(s => s.courseId === courseId)
      const courseCode = courseStates[0]?.course.courseCode ?? courseId

      for (const bucket of buckets) {
        const updatedInWeek = courseStates.filter(
          s => s.updatedAt >= bucket.start && s.updatedAt < bucket.end,
        )
        const newInWeek = courseStates.filter(
          s => s.createdAt >= bucket.start && s.createdAt < bucket.end,
        )

        const blooms = updatedInWeek
          .map(s => s.bloomHighWater)
          .filter((b): b is number => b != null)

        const avgBloom =
          blooms.length > 0
            ? Math.round((blooms.reduce((a, b) => a + b, 0) / blooms.length) * 10) / 10
            : null

        series.push({
          weekLabel: bucket.label,
          avgBloom,
          newConcepts: newInWeek.length,
          courseCode,
        })
      }
    }
  }

  return NextResponse.json({ series }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
