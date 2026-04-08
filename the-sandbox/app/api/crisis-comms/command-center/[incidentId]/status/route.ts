import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { updateIncidentStatus } from '../../../../../lib/crisis-comms/command-center/command-center-service'
import type { IncidentStatus } from '../../../../../lib/crisis-comms/command-center/types'

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ incidentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { incidentId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { status } = parsed.data as { status: IncidentStatus }
  const incident = await updateIncidentStatus(auth.user.id, incidentId, status)
  return NextResponse.json(incident)
})
