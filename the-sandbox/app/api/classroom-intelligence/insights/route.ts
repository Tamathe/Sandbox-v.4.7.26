import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getInsightCards } from '../../../lib/classroom-intelligence/classroom-intelligence-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const url = req.nextUrl.searchParams
  const courseId = url.get('courseId') ?? undefined
  const type = url.get('type') ?? undefined
  const viewedParam = url.get('viewed')
  const viewed = viewedParam === 'true' ? true : viewedParam === 'false' ? false : undefined
  const limitParam = url.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : undefined

  const cards = await getInsightCards(user.id, { courseId, type, viewed, limit })

  return NextResponse.json(cards, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
