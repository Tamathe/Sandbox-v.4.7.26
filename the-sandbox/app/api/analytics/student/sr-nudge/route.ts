/**
 * GET /api/analytics/student/sr-nudge
 *
 * Returns spaced-repetition review counts and the most-overdue concepts
 * for the requesting user. Auth: any role; response is scoped to requesting user.
 * FERPA: only includes ConceptState records from non-sensitive courses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const now = new Date()

  // Fetch all due ConceptState records for this user (missedReviews anomaly guard: <= 10)
  // Filter to non-sensitive courses via the Course → ToolSession relation.
  const dueConcepts = await prisma.conceptState.findMany({
    where: {
      userId: user.id,
      nextReviewAt: { lte: now },
      missedReviews: { lte: 10 },
      course: {
        toolSessions: {
          some: {
            userId: user.id,
            sensitiveSession: false,
          },
        },
      },
    },
    include: {
      course: { select: { courseCode: true } },
    },
    orderBy: { nextReviewAt: 'asc' },
  })

  const dueCount = dueConcepts.length
  const overdueCount = dueConcepts.filter(c => c.missedReviews > 0).length

  const top5 = dueConcepts.slice(0, 5).map(c => ({
    conceptSlug: c.conceptSlug,
    courseCode: c.course.courseCode,
    bloomHighWater: c.bloomHighWater ?? 1,
    missedReviews: c.missedReviews,
    nextReviewAt: c.nextReviewAt.toISOString(),
  }))

  return NextResponse.json({ dueCount, overdueCount, dueConcepts: top5 }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
