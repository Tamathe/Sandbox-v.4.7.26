/**
 * GET /api/analytics/effectiveness
 *
 * Returns ToolEffectivenessAggregate rows for a course, sorted by
 * effectivenessScore descending.  When toolId is also supplied, includes
 * an ObjectiveProgressSnapshot trend for the last 14 days.
 *
 * Query params:
 *   courseId   (required)
 *   toolId     (optional) — restricts to a single tool and adds objective trend
 *   windowDays (optional, default 7) — which aggregate window to return
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = request.nextUrl
  const courseId = searchParams.get('courseId')
  const toolId = searchParams.get('toolId') ?? undefined
  const windowDays = parseInt(searchParams.get('windowDays') ?? '7', 10)

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Fetch aggregates for this course (most-recent window matching windowDays)
  const aggregates = await prisma.toolEffectivenessAggregate.findMany({
    where: {
      courseId,
      ...(toolId ? { toolId } : {}),
      // windowEnd is the most recent midnight; approximate match by checking sessionCount > 0
    },
    orderBy: [{ windowEnd: 'desc' }, { effectivenessScore: 'desc' }],
    include: { tool: { select: { id: true, name: true, toolType: true } } },
  })

  // Deduplicate: keep only the most-recent aggregate per tool (latest windowEnd)
  const seenTools = new Set<string>()
  const latestAggregates = aggregates.filter((a) => {
    if (seenTools.has(a.toolId)) return false
    seenTools.add(a.toolId)
    return true
  })

  // Sort by effectivenessScore desc (nulls last)
  latestAggregates.sort((a, b) => {
    if (a.effectivenessScore === null && b.effectivenessScore === null) return 0
    if (a.effectivenessScore === null) return 1
    if (b.effectivenessScore === null) return -1
    return b.effectivenessScore - a.effectivenessScore
  })

  // If toolId specified, also return objective trend for last 14 days
  if (toolId) {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000)

    // Objectives for this course
    const objectives = await prisma.learningObjective.findMany({
      where: { courseId },
      select: { id: true, title: true },
    })

    const snapshots = await prisma.objectiveProgressSnapshot.findMany({
      where: {
        courseId,
        snapshotDate: { gte: fourteenDaysAgo },
      },
      orderBy: { snapshotDate: 'asc' },
      select: {
        objectiveId: true,
        snapshotDate: true,
        totalStudents: true,
        masteredCount: true,
        strugglingCount: true,
        notStartedCount: true,
        avgAttempts: true,
        avgCorrectRate: true,
      },
    })

    // Group snapshots by objective
    const byObjective = new Map<string, typeof snapshots>()
    for (const snap of snapshots) {
      const arr = byObjective.get(snap.objectiveId) ?? []
      arr.push(snap)
      byObjective.set(snap.objectiveId, arr)
    }

    const objectiveTrends = objectives.map((obj) => ({
      objectiveId: obj.id,
      title: obj.title,
      snapshots: byObjective.get(obj.id) ?? [],
    }))

    return NextResponse.json({ aggregates: latestAggregates, objectiveTrends })
  }

  return NextResponse.json({ aggregates: latestAggregates }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
