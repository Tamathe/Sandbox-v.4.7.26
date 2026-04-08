/**
 * POST /api/sandcastle/rooms/[roomId]/questions/[questionId]/close
 *
 * Closes a Game Show question, locks buzzer, broadcasts scoreboard. HOST only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { closeQuestion } from '../../../../../../../lib/sandcastle/game-show-service'
import { prisma } from '../../../../../../../lib/prisma'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; questionId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId, questionId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await closeQuestion(questionId, roomId, auth.user.id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string }
    return NextResponse.json(
      { error: e.message ?? 'Failed to close question', code: e.code },
      { status: e.status ?? 500 },
    )
  }
})
