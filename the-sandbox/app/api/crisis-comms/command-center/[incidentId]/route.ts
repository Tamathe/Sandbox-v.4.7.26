import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getIncident } from '../../../../lib/crisis-comms/command-center/command-center-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ incidentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { incidentId } = await context.params
  const incident = await getIncident(incidentId)
  return NextResponse.json(incident, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
