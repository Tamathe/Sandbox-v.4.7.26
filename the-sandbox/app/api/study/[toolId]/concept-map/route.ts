import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { getConceptMasteries } from '../../../../lib/concept-mastery-service'

/**
 * GET /api/study/[toolId]/concept-map?courseId=xxx
 *
 * Returns graph entities + edges + student mastery overlay for the concept map visualization.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  // Fetch graph entities, edges, and student mastery in parallel
  const [entities, edges, masteries, dueStates] = await Promise.all([
    prisma.graphEntity.findMany({
      where: { courseId },
      select: { id: true, name: true, type: true, description: true, communityId: true },
      take: 50,
    }).catch(() => []),

    prisma.graphEdge.findMany({
      where: { courseId },
      select: { fromId: true, toId: true, relation: true, weight: true },
    }).catch(() => []),

    getConceptMasteries(user.id).catch(() => []),

    prisma.conceptState.findMany({
      where: { userId: user.id, courseId },
      select: { conceptSlug: true, nextReviewAt: true, bloomHighWater: true },
    }).catch(() => []),
  ])

  // Build mastery lookup by normalized concept name
  const masteryMap = new Map<string, { mastery: number; isStale: boolean }>()
  for (const m of masteries) {
    masteryMap.set(m.concept.toLowerCase(), {
      mastery: m.effectiveMastery,
      isStale: m.isStale,
    })
  }

  // Build due lookup
  const now = new Date()
  const dueSet = new Set(
    dueStates
      .filter(d => d.nextReviewAt <= now)
      .map(d => d.conceptSlug),
  )

  // Enrich entities with mastery data
  const nodes = entities.map(e => {
    const key = e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const m = masteryMap.get(e.name.toLowerCase()) ?? masteryMap.get(key)
    return {
      id: e.id,
      label: e.name,
      type: e.type,
      description: e.description,
      communityId: e.communityId,
      mastery: m?.mastery ?? null,
      isStale: m?.isStale ?? false,
      isDue: dueSet.has(key),
      bloomHighWater: dueStates.find(d => d.conceptSlug === key)?.bloomHighWater ?? null,
    }
  })

  return NextResponse.json({ nodes, edges }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
