import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { getOrCreatePortfolio, updatePortfolio } from '../../lib/portfolio-service'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const portfolio = await getOrCreatePortfolio(auth.user.id)
    return NextResponse.json(portfolio, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const PATCH = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error

    const { portfolioId, title, bio } = parsed.data as { portfolioId: string; title?: string; bio?: string }
    const portfolio = await updatePortfolio(portfolioId, auth.user.id, { title, bio })
    return NextResponse.json(portfolio, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
