import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { getMetricHistory, getMetricTrends } from '../../../../lib/compliance-metrics-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const metric = url.searchParams.get('metric')
  const days = parseInt(url.searchParams.get('days') ?? '30', 10)

    if (metric) {
      const history = await getMetricHistory(metric, days)
      return NextResponse.json({ history }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // If no metric specified, return trends for all metrics
    const trends = await getMetricTrends()
    return NextResponse.json({ trends }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
