import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { getBottleneckForecasts } from '../../../lib/enrollment-forecast/forecast-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const term = req.nextUrl.searchParams.get('term') ?? 'Fall 2026'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)

  const bottlenecks = await getBottleneckForecasts(term, limit)

  return NextResponse.json({ term, count: bottlenecks.length, bottlenecks }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
