import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

/**
 * POST /api/study/[toolId]/flashcard-review
 *
 * Records a spaced-repetition quality rating for a flashcard.
 * Uses SM-2 algorithm to compute next review interval.
 *
 * Body: { conceptSlug: string, cardFront: string, quality: 1 | 3 | 5, courseId: string }
 *   quality 1 = "Again" (didn't know it)
 *   quality 3 = "Good" (got it with effort)
 *   quality 5 = "Easy" (knew it instantly)
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  await params // validate toolId exists in URL

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { conceptSlug?: string; cardFront?: string; quality?: number; courseId?: string }
  const { conceptSlug, cardFront, quality, courseId } = body

  if (!conceptSlug || !cardFront || !courseId) {
    return NextResponse.json({ error: 'conceptSlug, cardFront, and courseId are required' }, { status: 400 })
  }

  const q = typeof quality === 'number' ? quality : 3
  if (![1, 2, 3, 4, 5].includes(q)) {
    return NextResponse.json({ error: 'quality must be 1-5' }, { status: 400 })
  }

  // Normalize concept slug
  const slug = conceptSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)

  // Normalize card front (trim, take first 200 chars)
  const front = cardFront.trim().slice(0, 200)

  // Fetch existing state or use defaults
  const existing = await prisma.flashcardState.findUnique({
    where: {
      userId_courseId_conceptSlug_cardFront: {
        userId: user.id,
        courseId,
        conceptSlug: slug,
        cardFront: front,
      },
    },
  })

  const oldEF = existing?.easeFactor ?? 2.5
  const oldStability = existing?.stabilityDays ?? 1.0
  const oldReviewCount = existing?.reviewCount ?? 0

  // SM-2 algorithm
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // Clamp EF >= 1.3
  const newEF = Math.max(1.3, oldEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  let newStability: number
  if (q < 3) {
    // Failed — reset to short interval
    newStability = 0.5 // 12 hours
  } else if (oldReviewCount === 0) {
    // First successful review
    newStability = 1.0
  } else if (oldReviewCount === 1) {
    // Second successful review
    newStability = 3.0
  } else {
    // Subsequent reviews: multiply by ease factor
    newStability = oldStability * newEF
  }

  // Cap at 180 days max interval
  newStability = Math.min(180, newStability)

  const msPerDay = 24 * 60 * 60 * 1000
  const nextReviewAt = new Date(Date.now() + newStability * msPerDay)

  const updated = await prisma.flashcardState.upsert({
    where: {
      userId_courseId_conceptSlug_cardFront: {
        userId: user.id,
        courseId,
        conceptSlug: slug,
        cardFront: front,
      },
    },
    create: {
      userId: user.id,
      courseId,
      conceptSlug: slug,
      cardFront: front,
      stabilityDays: newStability,
      nextReviewAt,
      easeFactor: newEF,
      reviewCount: 1,
      lastQuality: q,
    },
    update: {
      stabilityDays: newStability,
      nextReviewAt,
      easeFactor: newEF,
      reviewCount: oldReviewCount + 1,
      lastQuality: q,
    },
  })

  return NextResponse.json({
    id: updated.id,
    nextReviewAt: updated.nextReviewAt.toISOString(),
    stabilityDays: updated.stabilityDays,
    easeFactor: updated.easeFactor,
    reviewCount: updated.reviewCount,
  })
})
