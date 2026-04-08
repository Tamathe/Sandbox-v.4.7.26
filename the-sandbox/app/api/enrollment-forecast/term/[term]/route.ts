import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { getForecastsForTerm } from '../../../../lib/enrollment-forecast/forecast-service'

export const GET = withErrorHandling(
  async (req: NextRequest, context: { params: Promise<{ term: string }> }) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { term } = await context.params
    // URL-decode the term (e.g., "Fall%202026" → "Fall 2026")
    const decodedTerm = decodeURIComponent(term)

    const forecasts = await getForecastsForTerm(decodedTerm)

    const grouped = {
      term: decodedTerm,
      total: forecasts.length,
      bottlenecks: forecasts.filter((f) => f.riskLevel === 'bottleneck'),
      overCapacity: forecasts.filter((f) => f.riskLevel === 'over-capacity'),
      underEnrolled: forecasts.filter((f) => f.riskLevel === 'under-enrolled'),
      normal: forecasts.filter((f) => f.riskLevel === 'normal'),
    }

    return NextResponse.json(grouped, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
)
