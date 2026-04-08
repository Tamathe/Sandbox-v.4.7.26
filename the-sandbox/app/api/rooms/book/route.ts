import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { ROOMS } from '../../../lib/room-data'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { roomId: string; date: string; startTime: string; endTime: string; purpose: string; attendees: number }

  if (!body.roomId || !body.date || !body.startTime || !body.endTime || !body.purpose) {
    return NextResponse.json({ error: 'Missing required fields: roomId, date, startTime, endTime, purpose' }, { status: 400 })
  }

  const room = ROOMS.find(r => r.id === body.roomId)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // In demo mode, just return a confirmation (no real booking)
  const booking = {
    id: `booking-${Date.now()}`,
    roomId: body.roomId,
    roomName: room.name,
    building: room.building,
    userId: auth.user.id,
    userName: auth.user.name,
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
    purpose: body.purpose,
    attendees: body.attendees,
    status: 'confirmed' as const,
    createdAt: new Date().toISOString(),
  }

  return NextResponse.json({ booking, message: `Room ${room.name} in ${room.building} booked for ${body.date} ${body.startTime}-${body.endTime}.` })
})
