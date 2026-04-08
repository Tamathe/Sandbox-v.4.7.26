/**
 * POST /api/sandcastle/rooms/[roomId]/hand/grant
 *
 * Grants the floor to a participant (lowers their hand, broadcasts speaker_granted).
 * Auth: HOST only.
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { grantSpeaker } from '../../../../../../lib/sandcastle/seminar-service'

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

  const parsed = await parseRequestBody<{ participantId?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  if (!body.participantId) {
    return Response.json({ error: 'participantId is required' }, { status: 400 })
  }

  await grantSpeaker(roomId, body.participantId, auth.user.id)
  return Response.json({ ok: true })
})
