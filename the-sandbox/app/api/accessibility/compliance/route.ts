import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { getComplianceSummary } from '../../../lib/accessibility/compliance-aggregator'

// GET — compliance dashboard data (ADMIN sees university-wide, STAFF sees department)
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const scope = (req.nextUrl.searchParams.get('scope') as 'university' | 'department' | 'course') ?? 'university'
  const scopeId = req.nextUrl.searchParams.get('scopeId') ?? undefined

  const summary = await getComplianceSummary(scope, scopeId)

  return NextResponse.json(summary, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
