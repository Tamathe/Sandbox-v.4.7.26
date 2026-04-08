import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getCaseAnalytics } from '../../../../lib/virtual-clinic/analytics-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) {
    return NextResponse.json({ error: 'caseId query parameter is required' }, { status: 400 })
  }

  const data = await getCaseAnalytics(caseId, auth.user.id)
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
