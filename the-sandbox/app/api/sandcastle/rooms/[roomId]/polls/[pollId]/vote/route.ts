/**
 * Student vote endpoint — REST alternative to the WS POLL_VOTE message.
 * Phase 1: students POST here; Phase 2 can migrate to WS once supported.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { prisma } from '../../../../../../../lib/prisma'
import { recordVote } from '../../../../../../../lib/sandcastle/poll-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; pollId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId, pollId } = await params

  const body = await parseRequestBody<{ participantId?: string; optionIndex?: number }>(request)
  if ('error' in body) return body.error

  const { participantId, optionIndex } = body.data

  if (!participantId) {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
  }
  if (typeof optionIndex !== 'number') {
    return NextResponse.json({ error: 'optionIndex is required' }, { status: 400 })
  }

  // Verify participant belongs to this user and room
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { userId: true, roomId: true },
  })
  if (!participant || participant.roomId !== roomId) {
    return NextResponse.json({ error: 'Participant not found in this room' }, { status: 404 })
  }
  if (participant.userId && participant.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await recordVote(pollId, roomId, participantId, optionIndex)

  if (!result.accepted) {
    return NextResponse.json(
      { type: 'VOTE_REJECTED', pollId, reason: result.reason },
      { status: 409 },
    )
  }

  return NextResponse.json({ type: 'VOTE_ACK', pollId, optionIndex })
})
