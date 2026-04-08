import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { getRoomByJoinCode } from '../../../../../lib/sandcastle/room-service'
import { signWsToken } from '../../../../../lib/sandcastle/ws-auth'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ joinCode: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { joinCode } = await params
  const result = await getRoomByJoinCode(joinCode.toUpperCase())
  if (!result) {
    return NextResponse.json({ error: 'Join code not found', code: 'CODE_NOT_FOUND' }, { status: 404 })
  }

  if (result.room.endedAt) {
    return NextResponse.json({ error: 'Room has ended', code: 'ROOM_ENDED' }, { status: 410 })
  }

  // Issue a participant-role token for this user
  const wsToken = signWsToken(auth.user.id, result.room.roomId, 'PARTICIPANT')
  return NextResponse.json({ roomId: result.room.roomId, wsToken, room: result.room }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
