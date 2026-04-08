/**
 * GET /api/sandcastle/rooms/[roomId]/hand/queue
 *
 * Returns the current hand-raise queue ordered by raise time.
 * Auth: HOST only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { getQueue } from '../../../../../../lib/sandcastle/seminar-service'

export const GET = withErrorHandling(async (
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

  const queue = await getQueue(roomId)
  return NextResponse.json({ queue }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
