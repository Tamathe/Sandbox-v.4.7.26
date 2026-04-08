import { NextRequest, NextResponse } from 'next/server'
import { getPublicPortfolio } from '../../../../lib/portfolio-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) => {
    const { shareToken } = await params
    const portfolio = await getPublicPortfolio(shareToken)

    if (!portfolio || !portfolio.isPublic) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    return NextResponse.json(portfolio, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
