/**
 * GET /api/analytics/learning-science
 *
 * Platform-wide learning science signals for ADMIN role.
 * Returns Bloom distribution, cognitive load trend, misconception prevalence,
 * and spaced-repetition compliance metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

type WeekRow = {
  week_label: string
  avg_load: number | null
  avg_frustration: number | null
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ── 1. Bloom Distribution ─────────────────────────────────────────────────
  // Group ToolSession by bloomLevel (non-null, non-sensitive)
  const bloomGroups = await prisma.toolSession.groupBy({
    by: ['bloomLevel'],
    where: {
      bloomLevel: { not: null },
      sensitiveSession: false,
    },
    _count: { bloomLevel: true },
  })

  const bloomTotal = bloomGroups.reduce((sum, g) => sum + g._count.bloomLevel, 0)
  const bloomDistribution = [1, 2, 3, 4, 5, 6].map(level => {
    const found = bloomGroups.find(g => g.bloomLevel === level)
    const count = found?._count.bloomLevel ?? 0
    return {
      level,
      label: BLOOM_LABELS[level] ?? `Level ${level}`,
      count,
      pct: bloomTotal > 0 ? Math.round((count / bloomTotal) * 100) : 0,
    }
  })

  // ── 2. Cognitive Load Trend — last 8 weeks via raw SQL ───────────────────
  const cognitiveLoadTrend = await prisma.$queryRaw<WeekRow[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('week', ts."startedAt"), 'Mon DD') AS week_label,
      ROUND(AVG(ts."cognitiveLoad")::numeric, 2)            AS avg_load,
      ROUND(AVG(ts."frustrationScore")::numeric, 2)         AS avg_frustration
    FROM "ToolSession" ts
    WHERE ts."startedAt" >= NOW() - INTERVAL '8 weeks'
      AND ts."sensitiveSession" = false
      AND (ts."cognitiveLoad" IS NOT NULL OR ts."frustrationScore" IS NOT NULL)
    GROUP BY DATE_TRUNC('week', ts."startedAt")
    ORDER BY DATE_TRUNC('week', ts."startedAt") ASC
  `

  const cognitiveLoadTrendOut = cognitiveLoadTrend.map(r => ({
    weekLabel: r.week_label,
    avgLoad: r.avg_load != null ? Number(r.avg_load) : null,
    avgFrustration: r.avg_frustration != null ? Number(r.avg_frustration) : null,
  }))

  // ── 3. Misconception Prevalence — top 10 ─────────────────────────────────
  const misconceptions = await prisma.misconceptionTaxonomy.findMany({
    where: { prevalence: { gt: 0 } },
    orderBy: { prevalence: 'desc' },
    take: 10,
    select: {
      conceptSlug: true,
      prevalence: true,
      course: { select: { courseCode: true } },
    },
  })

  // firedCount: count of ConceptState records that have fired this misconception's conceptSlug
  const misconceptionConceptSlugs = misconceptions.map(m => m.conceptSlug)
  const firedCounts = misconceptionConceptSlugs.length > 0
    ? await prisma.conceptState.groupBy({
        by: ['conceptSlug'],
        where: { conceptSlug: { in: misconceptionConceptSlugs } },
        _count: { conceptSlug: true },
      })
    : []

  const firedCountMap = new Map(firedCounts.map(r => [r.conceptSlug, r._count.conceptSlug]))

  const misconceptionPrevalence = misconceptions.map(m => ({
    conceptSlug: m.conceptSlug,
    courseCode: m.course.courseCode,
    prevalence: m.prevalence,
    firedCount: firedCountMap.get(m.conceptSlug) ?? 0,
  }))

  // ── 4. SR Compliance ─────────────────────────────────────────────────────
  const [totalDue, reviewedLast7Days] = await Promise.all([
    prisma.conceptState.count({
      where: { nextReviewAt: { lte: now } },
    }),
    prisma.conceptState.count({
      where: {
        missedReviews: 0,
        updatedAt: { gte: sevenDaysAgo },
      },
    }),
  ])

  const complianceRate = totalDue > 0 ? reviewedLast7Days / totalDue : 0

  return NextResponse.json({
    bloomDistribution,
    cognitiveLoadTrend: cognitiveLoadTrendOut,
    misconceptionPrevalence,
    srCompliance: {
      totalDue,
      reviewedLast7Days,
      complianceRate: Math.round(complianceRate * 100) / 100,
    },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
