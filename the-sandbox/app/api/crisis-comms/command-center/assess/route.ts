import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { assessIncident } from '../../../../lib/crisis-comms/command-center/command-center-service'
import type { SeverityLevel } from '../../../../lib/crisis-comms/command-center/types'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { incidentId, inputText, severity, hasTitle } = parsed.data as {
    incidentId: string
    inputText: string
    severity: SeverityLevel
    hasTitle: boolean
  }
  const result = await assessIncident(auth.user.id, incidentId, inputText, severity, hasTitle)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
})
