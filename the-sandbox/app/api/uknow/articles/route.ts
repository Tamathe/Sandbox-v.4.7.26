import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../lib/server-auth'
import { searchArticles } from '../../../lib/uknow-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { searchParams } = req.nextUrl
    const q = searchParams.get('q') ?? ''
    const section = searchParams.get('section') ?? undefined
    const startDate = searchParams.get('startDate') ?? undefined
    const endDate = searchParams.get('endDate') ?? undefined
    const sentiment = searchParams.get('sentiment') ?? undefined
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))

    if (parseInt(searchParams.get('pageSize') ?? '20', 10) > 50) {
      return NextResponse.json({ error: 'pageSize cannot exceed 50' }, { status: 400 })
    }

    const { articles, total } = await searchArticles(q, section, startDate, endDate, page, pageSize, auth.user.id, sentiment)

    return NextResponse.json({ articles, total, page, pageSize }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
