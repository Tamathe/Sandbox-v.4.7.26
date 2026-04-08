import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

/**
 * GET /api/study/[toolId]/flashcard-stats?courseId=xxx
 *
 * Returns spaced-repetition flashcard statistics for the SR dashboard widget.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const courseId = req.nextUrl.searchParams.get('courseId')

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const where = {
    userId: user.id,
    ...(courseId ? { courseId } : {}),
  }

  // Run all counts in parallel
  const [totalCards, dueNow, dueTomorrow, dueThisWeek, recentReviews] = await Promise.all([
    // Total tracked flashcards
    prisma.flashcardState.count({ where }),

    // Cards due right now (overdue + due today)
    prisma.flashcardState.count({
      where: { ...where, nextReviewAt: { lte: now } },
    }),

    // Cards due by tomorrow
    prisma.flashcardState.count({
      where: { ...where, nextReviewAt: { lte: tomorrow } },
    }),

    // Cards due within 7 days
    prisma.flashcardState.count({
      where: { ...where, nextReviewAt: { lte: weekFromNow } },
    }),

    // Cards reviewed in the last 7 days (reviewCount > 0 and updatedAt recent)
    prisma.flashcardState.count({
      where: {
        ...where,
        reviewCount: { gt: 0 },
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  // Compute review rate (reviewed / total due this week)
  const reviewRate = dueThisWeek > 0
    ? Math.min(1, recentReviews / dueThisWeek)
    : totalCards > 0 ? 1 : 0

  // Get the due cards with details (for "Start Review" mode)
  const dueCards = await prisma.flashcardState.findMany({
    where: { ...where, nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: 'asc' },
    take: 20,
    select: {
      conceptSlug: true,
      cardFront: true,
      stabilityDays: true,
      reviewCount: true,
      lastQuality: true,
    },
  })

  return NextResponse.json({
    totalCards,
    dueNow,
    dueTomorrow: dueTomorrow - dueNow, // only cards due tomorrow, not already due
    dueThisWeek: dueThisWeek - dueNow, // only cards due this week beyond today
    reviewRate: Math.round(reviewRate * 100),
    recentReviews,
    dueCards: dueCards.map(c => ({
      conceptSlug: c.conceptSlug,
      cardFront: c.cardFront,
      stabilityDays: c.stabilityDays,
      reviewCount: c.reviewCount,
      lastQuality: c.lastQuality,
    })),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
