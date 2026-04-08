import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../../lib/server-auth'
import { getArticle, getRelatedArticles, UknowArticleSummary } from '../../../../lib/uknow-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { slug } = await params

    const article = await getArticle(slug)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    let related: UknowArticleSummary[] = []
    try {
      related = await getRelatedArticles(article.id, article.title, 4, article.section)
    } catch {
      // Silently degrade — OPENAI_API_KEY may be missing or embed may fail
    }

    return NextResponse.json({ article, related }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
