import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { confirmAssessment } from '../../../../../lib/crisis-comms/command-center/command-center-service'
import type { AssessmentResult } from '../../../../../lib/crisis-comms/command-center/types'

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ incidentId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { incidentId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { assessment: AssessmentResult }
  const incident = await confirmAssessment(auth.user.id, incidentId, body.assessment)
  return NextResponse.json(incident)
})
