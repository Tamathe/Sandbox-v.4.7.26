import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getCampusAIPulse } from '../../../lib/ai-literacy/campus-pulse-service'
import { getStanceDriftData } from '../../../lib/ai-literacy/stance-drift-service'

// GET — campus AI readiness pulse + stance drift
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const months = parseInt(req.nextUrl.searchParams.get('months') ?? '6', 10)

  const [pulse, drift] = await Promise.all([
    getCampusAIPulse(),
    getStanceDriftData(months),
  ])

  return NextResponse.json({ pulse, drift }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
