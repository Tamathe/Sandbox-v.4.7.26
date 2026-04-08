import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { startReview, completeReview, deleteReview, getReview } from '../../../../lib/access-review-service'

type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params
  const parsed = await parseRequestBody<{ action: 'start' | 'complete' }>(request)
  if ('error' in parsed) return parsed.error

  if (!parsed.data.action || !['start', 'complete'].includes(parsed.data.action)) {
    return NextResponse.json({ error: 'action must be "start" or "complete"' }, { status: 400 })
  }

    let review
    if (parsed.data.action === 'start') {
      review = await startReview(id, auth.user.id)
    } else {
      review = await completeReview(id)
    }
    return NextResponse.json(review, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params

    await deleteReview(id)
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const GET = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params

    const review = await getReview(id)
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json(review, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
