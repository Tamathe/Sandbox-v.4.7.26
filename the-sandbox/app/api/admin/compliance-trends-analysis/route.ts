import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { analyzeTrends } from '../../../lib/compliance-trend-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') ?? '6', 10)
    const clampedMonths = Math.min(Math.max(months, 1), 24)

    const result = await analyzeTrends(clampedMonths)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
