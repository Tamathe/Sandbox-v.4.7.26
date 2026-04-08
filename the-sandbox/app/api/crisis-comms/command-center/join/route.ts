import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { joinRoom } from '../../../../lib/crisis-comms/command-center/command-center-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { roomCode } = parsed.data as { roomCode: string }
  const incident = await joinRoom(auth.user.id, roomCode)
  return NextResponse.json(incident)
})
