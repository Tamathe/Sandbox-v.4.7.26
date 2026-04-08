import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { bookRoom } from '../../../../lib/university-systems-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { roomId, date, startTime, endTime, eventTitle } = parsed.data as { roomId?: string; date?: string; startTime?: string; endTime?: string; eventTitle?: string }

  if (!roomId || !date || !startTime || !endTime || !eventTitle) {
    return NextResponse.json({ error: 'roomId, date, startTime, endTime, and eventTitle are required' }, { status: 400 })
  }

  const result = await bookRoom(roomId, {
    date,
    startTime,
    endTime,
    eventTitle,
    requesterId: auth.user.id,
  })
  return NextResponse.json(result, { status: 201 })
})
