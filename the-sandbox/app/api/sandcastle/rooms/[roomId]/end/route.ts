import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { endRoom } from '../../../../../lib/sandcastle/room-service'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) {
    return NextResponse.json({ error: 'Room not found', code: 'ROOM_NOT_FOUND' }, { status: 404 })
  }
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { generateReport?: boolean }

  try {
    const result = await endRoom(roomId, auth.user.id, { generateReport: body.generateReport })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string }
    return NextResponse.json(
      { error: e.message ?? 'Failed to end room', code: e.code },
      { status: e.status ?? 500 },
    )
  }
})
