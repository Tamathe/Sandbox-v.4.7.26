import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getIncidentsByUser } from '../../../../lib/crisis-comms/command-center/command-center-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const incidents = await getIncidentsByUser(auth.user.id)
  return NextResponse.json(incidents, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
