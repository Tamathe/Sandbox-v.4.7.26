/**
 * POST /api/sandcastle/rooms/[roomId]/hand/lower
 *
 * Lowers a hand. PARTICIPANT can lower their own; HOST can lower any.
 * Auth: PARTICIPANT (own) or HOST (body: { participantId }).
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { lowerHand } from '../../../../../../lib/sandcastle/seminar-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody<{ participantId?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })

  const isHost = room.hostId === auth.user.id || auth.user.role === 'ADMIN'

  let targetParticipantId: string | undefined

  if (isHost && body.participantId) {
    // Host lowering any participant's hand
    targetParticipantId = body.participantId
  } else {
    // Participant lowering their own hand
    const participant = await prisma.participant.findFirst({
      where: { roomId, userId: auth.user.id, leftAt: null },
      select: { id: true },
    })
    if (!participant) return Response.json({ error: 'Participant not found' }, { status: 404 })
    targetParticipantId = participant.id
  }

  await lowerHand(roomId, targetParticipantId)
  return Response.json({ ok: true })
})
