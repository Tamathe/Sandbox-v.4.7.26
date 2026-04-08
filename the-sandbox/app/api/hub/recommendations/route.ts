import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getRecommendations } from '../../../lib/hub-recommendations'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '6', 10)

  const recommendations = await getRecommendations(
    auth.user.id,
    auth.user.role,
    auth.user.college,
    limit,
  )

  return NextResponse.json({ recommendations }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
