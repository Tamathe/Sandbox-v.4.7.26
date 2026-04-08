import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../lib/server-auth'
import { getRecommendedArticles } from '../../../lib/uknow-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const articles = await getRecommendedArticles(auth.user.id, 4)
    return NextResponse.json({ articles }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
