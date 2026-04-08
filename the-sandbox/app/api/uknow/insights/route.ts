import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../lib/server-auth'
import { getInsightsDashboard } from '../../../lib/uknow-insights-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const college = searchParams.get('college') || undefined
  const days = parseInt(searchParams.get('days') ?? '90', 10)

  const dashboard = await getInsightsDashboard({ college, days })
  return NextResponse.json(dashboard, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
