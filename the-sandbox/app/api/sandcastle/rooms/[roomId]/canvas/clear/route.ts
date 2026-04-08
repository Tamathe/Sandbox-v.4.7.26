/**
 * POST /api/sandcastle/rooms/[roomId]/canvas/clear
 *
 * Clears the room canvas (deletes Redis key) and broadcasts canvas_cleared.
 * Auth: HOST only.
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { clearCanvas } from '../../../../../../lib/sandcastle/canvas-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden — HOST only' }, { status: 403 })
  }

  await clearCanvas(roomId, auth.user.id)
  return Response.json({ ok: true })
})
