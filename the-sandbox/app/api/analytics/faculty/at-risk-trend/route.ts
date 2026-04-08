/**
 * GET /api/analytics/faculty/at-risk-trend?courseId=<id>
 *
 * Returns 8-week trend of at-risk student counts (score < 0.6) vs total active
 * students for the given course.
 *
 * Response:
 *   { trend: { weekLabel: string; atRiskCount: number; totalActive: number }[] }
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

/** Return the ISO week start (Monday 00:00 UTC) for a given date. */
function weekStart(d: Date): Date {
  const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const dayOfWeek = new Date(ms).getUTCDay() // 0=Sun
  const monday = ms - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86_400_000)
  return new Date(monday)
}

/** Format a Date as "Mon DD" (e.g., "Mar 03"). */
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

  // Build the 8-week window (current week inclusive, back 7 more)
  const now = new Date()
  const currentWeekStart = weekStart(now)
  const weeks: Date[] = []
  for (let i = 7; i >= 0; i--) {
    weeks.push(new Date(currentWeekStart.getTime() - i * 7 * 86_400_000))
  }
  const windowStart = weeks[0]

  // Fetch all scored sessions in the window for this course (FERPA: exclude sensitiveSession)
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      sensitiveSession: false,
      startedAt: { gte: windowStart },
      userId: { not: null },
    },
    select: {
      userId: true,
      score: true,
      startedAt: true,
    },
  })

  // Bucket by ISO week start
  type WeekBucket = { atRisk: Set<string>; total: Set<string> }
  const buckets = new Map<number, WeekBucket>()

  for (const week of weeks) {
    buckets.set(week.getTime(), { atRisk: new Set(), total: new Set() })
  }

  for (const session of sessions) {
    if (!session.userId) continue
    const ws = weekStart(session.startedAt)
    const bucket = buckets.get(ws.getTime())
    if (!bucket) continue
    bucket.total.add(session.userId)
    if (session.score !== null && session.score < 0.6) {
      bucket.atRisk.add(session.userId)
    }
  }

  const trend = weeks.map(w => ({
    weekLabel: fmtWeek(w),
    atRiskCount: buckets.get(w.getTime())?.atRisk.size ?? 0,
    totalActive: buckets.get(w.getTime())?.total.size ?? 0,
  }))

  return NextResponse.json({ trend }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
