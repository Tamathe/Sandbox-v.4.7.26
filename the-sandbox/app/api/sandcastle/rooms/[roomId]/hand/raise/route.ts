/**
 * POST /api/sandcastle/rooms/[roomId]/hand/raise
 *
 * Raises the calling participant's hand (sets handRaisedAt, broadcasts queue update).
 * Auth: PARTICIPANT only (own hand).
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { raiseHand } from '../../../../../../lib/sandcastle/seminar-service'

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

  if (!body.participantId) {
    return Response.json({ error: 'participantId is required' }, { status: 400 })
  }

  // Verify participant belongs to caller (not someone else's hand)
  const participant = await prisma.participant.findUnique({
    where: { id: body.participantId },
    select: { userId: true, roomId: true },
  })
  if (!participant || participant.roomId !== roomId) {
    return Response.json({ error: 'Participant not found in this room' }, { status: 404 })
  }
  if (participant.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden — you can only raise your own hand' }, { status: 403 })
  }

  const result = await raiseHand(roomId, body.participantId)
  return Response.json(result)
})
