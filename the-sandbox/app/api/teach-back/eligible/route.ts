import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const courseId = req.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    // Find concepts with mastery > 0.75 for this course
    const masteries = await prisma.studentConceptMastery.findMany({
      where: {
        userId: user.id,
        masteryLevel: { gte: 0.75 },
        coursesEncountered: { has: courseId },
      },
      orderBy: { masteryLevel: 'desc' },
      take: 10,
      select: { concept: true, masteryLevel: true },
    })

    if (masteries.length === 0) {
      return NextResponse.json({ concepts: [] }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // Filter to Bloom < 6
    const conceptStates = await prisma.conceptState.findMany({
      where: {
        userId: user.id,
        courseId,
        conceptSlug: { in: masteries.map((m) => m.concept) },
      },
      select: { conceptSlug: true, bloomHighWater: true },
    })
    const bloomMap = new Map(conceptStates.map((s) => [s.conceptSlug, s.bloomHighWater ?? 0]))

    const eligible = masteries
      .filter((m) => (bloomMap.get(m.concept) ?? 0) < 6)
      .map((m) => ({
        slug: m.concept,
        label: m.concept.replace(/-/g, ' '),
        mastery: m.masteryLevel,
      }))

    return NextResponse.json({ concepts: eligible }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
