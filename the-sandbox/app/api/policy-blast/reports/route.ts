import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getImpactReports } from '../../../lib/policy-blast/policy-blast-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl.searchParams
  const status = url.get('status') ?? undefined
  const limitParam = url.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : undefined

  const reports = await getImpactReports({ status, limit })
  return NextResponse.json(reports, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
