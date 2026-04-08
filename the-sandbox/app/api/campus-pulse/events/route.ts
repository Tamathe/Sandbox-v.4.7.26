import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getAllEvents, getPulseKpis } from '../../../lib/campus-pulse/campus-pulse-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const severity = url.searchParams.get('severity') || undefined
  const status = url.searchParams.get('status') || undefined
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const [events, kpis] = await Promise.all([
    getAllEvents({ severity, status, limit }),
    getPulseKpis(),
  ])

  return NextResponse.json({ events, kpis }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
