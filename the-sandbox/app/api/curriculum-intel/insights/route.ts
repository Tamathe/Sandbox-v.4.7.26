import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getInsights } from '../../../lib/curriculum-intel/curriculum-service'
import type { InsightType, InsightSeverity, InsightStatus } from '../../../lib/curriculum-intel/types'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const type = (url.searchParams.get('type') ?? undefined) as InsightType | undefined
  const severity = (url.searchParams.get('severity') ?? undefined) as InsightSeverity | undefined
  const status = (url.searchParams.get('status') ?? undefined) as InsightStatus | undefined

  const insights = await getInsights({ type, severity, status })

  return NextResponse.json({ insights }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
