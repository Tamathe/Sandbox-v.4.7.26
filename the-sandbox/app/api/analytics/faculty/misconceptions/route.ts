import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

    const courseId = req.nextUrl.searchParams.get('courseId')
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

    // Get all misconceptions for this course
    const misconceptions = await prisma.misconceptionTaxonomy.findMany({
      where: { courseId },
      orderBy: { prevalence: 'desc' },
    })

    const unseededAlert = misconceptions.length === 0

    if (misconceptions.length === 0) {
      return NextResponse.json({ topMisconceptions: [], unseededAlert })
    }

    // Count how many ConceptState records have each misconception ID in their firedMisconceptions array
    // We do this with raw aggregation: find all ConceptState records for this course
    const conceptStates = await prisma.conceptState.findMany({
      where: { courseId },
      select: { firedMisconceptions: true },
    })

    // Build a map of misconception ID -> fired count
    const firedCountMap = new Map<string, number>()
    for (const cs of conceptStates) {
      for (const mId of cs.firedMisconceptions) {
        firedCountMap.set(mId, (firedCountMap.get(mId) ?? 0) + 1)
      }
    }

    const topMisconceptions = misconceptions
      .map(m => ({
        id: m.id,
        conceptSlug: m.conceptSlug,
        misconceptionText: m.remediationHint.split('.')[0] ?? m.conceptSlug, // first sentence as label
        prevalence: m.prevalence,
        firedCount: firedCountMap.get(m.id) ?? 0,
        remediationHint: m.remediationHint,
      }))
      .sort((a, b) => b.firedCount - a.firedCount)

  return NextResponse.json({ topMisconceptions, unseededAlert }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
