import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { submitFlashcardReview, type ReviewQuality } from '../../../lib/flashcard-quick-review-service'

const VALID_QUALITIES = new Set<ReviewQuality>(['again', 'hard', 'good', 'easy'])

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { flashcardId, quality } = parsed.data as { flashcardId: string; quality: ReviewQuality }

  if (!flashcardId || !quality || !VALID_QUALITIES.has(quality)) {
    return NextResponse.json(
      { error: 'flashcardId and quality (again|hard|good|easy) are required' },
      { status: 400 },
    )
  }

  const result = await submitFlashcardReview(auth.user.id, flashcardId, quality)
  return NextResponse.json(result)
})
