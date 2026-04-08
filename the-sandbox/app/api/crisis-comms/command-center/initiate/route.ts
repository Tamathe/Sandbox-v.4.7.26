import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { initiateIncident } from '../../../../lib/crisis-comms/command-center/command-center-service'
import type { InitiateRequest } from '../../../../lib/crisis-comms/command-center/types'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as InitiateRequest
  const result = await initiateIncident(auth.user.id, body)
  return NextResponse.json(result, { status: 201 })
})
