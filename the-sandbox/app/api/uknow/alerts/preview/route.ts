import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../../lib/server-auth'
import { getAlertPreviewArticles } from '../../../../lib/uknow-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const q = req.nextUrl.searchParams.get('q')
    if (!q || q.trim().length < 3) {
      return NextResponse.json({ articles: [] }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // Graceful degradation if OpenAI key is missing
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ articles: [] }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    const articles = await getAlertPreviewArticles(q.trim(), 3)
    return NextResponse.json({ articles }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
