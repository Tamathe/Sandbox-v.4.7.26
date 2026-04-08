import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createReview, listReviews } from '../../../lib/access-review-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const reviews = await listReviews()
    return NextResponse.json({ reviews }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ reviewCycle: string }>(request)
  if ('error' in parsed) return parsed.error

  if (!parsed.data.reviewCycle) {
    return NextResponse.json({ error: 'reviewCycle is required' }, { status: 400 })
  }

    const review = await createReview(parsed.data.reviewCycle)
    return NextResponse.json(review, { status: 201 })

})
