/**
 * GET /api/analytics/faculty/velocity-heatmap?courseId=<id>
 *
 * Aggregates LearnerObservationLog records by ISO week for a given course,
 * returning class-level cognitive load, frustration, and Bloom averages
 * for the last 8 weeks.
 *
 * Returns:
 *   weeks[] — one entry per ISO week with:
 *     weekLabel       — e.g. "Mar 10" (Monday of that week)
 *     avgCognitiveLoad  — 0.0–1.0 | null
 *     avgFrustration    — 0.0–1.0 | null
 *     avgBloomLevel     — 0.0–6.0 | null
 *     sessionCount      — distinct sessions in that week
 *     observationCount  — total observation records
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { subWeeks, format } from 'date-fns'

export const runtime = 'nodejs'

type WeekRow = {
  week_start: Date
  avg_cognitive_load: string | null
  avg_frustration: string | null
  avg_bloom_level: string | null
  session_count: bigint
  observation_count: bigint
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Educators may only view their own courses
  if (auth.user.role !== 'ADMIN') {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    })
    if (!course || course.instructorId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const eightWeeksAgo = subWeeks(new Date(), 8)

    const rows = await prisma.$queryRawUnsafe<WeekRow[]>(
      `SELECT
         DATE_TRUNC('week', lol."createdAt") AS week_start,
         AVG(lol."cognitiveLoad")            AS avg_cognitive_load,
         AVG(lol."frustrationScore")         AS avg_frustration,
         AVG(lol."bloomLevel"::float)        AS avg_bloom_level,
         COUNT(DISTINCT ts.id)               AS session_count,
         COUNT(lol.id)                       AS observation_count
       FROM "LearnerObservationLog" lol
       JOIN "ToolSession" ts ON ts.id = lol."sessionId"
       WHERE ts."courseId" = $1
         AND ts."sensitiveSession" = false
         AND lol."createdAt" >= $2
       GROUP BY DATE_TRUNC('week', lol."createdAt")
       ORDER BY week_start ASC`,
      courseId,
      eightWeeksAgo.toISOString(),
    )

    const toNum = (v: string | null): number | null => {
      if (v == null) return null
      const n = parseFloat(String(v))
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
    }

    const weeks = rows.map((row) => ({
      weekLabel: format(new Date(row.week_start), 'MMM d'),
      avgCognitiveLoad: toNum(row.avg_cognitive_load),
      avgFrustration: toNum(row.avg_frustration),
      avgBloomLevel: toNum(row.avg_bloom_level),
      sessionCount: Number(row.session_count),
      observationCount: Number(row.observation_count),
    }))

  return NextResponse.json({ weeks }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
