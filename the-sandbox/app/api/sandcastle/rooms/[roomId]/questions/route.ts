/**
 * POST /api/sandcastle/rooms/[roomId]/questions
 *
 * Opens a new Game Show question. HOST only.
 * Body: { text: string; imageUrl?: string; timeoutMs?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { openQuestion } from '../../../../../lib/sandcastle/game-show-service'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await parseRequestBody<{ text?: string; imageUrl?: string; timeoutMs?: number }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const question = await openQuestion(
      roomId,
      auth.user.id,
      body.text.trim(),
      body.imageUrl,
      body.timeoutMs,
    )
    return NextResponse.json(question)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string }
    return NextResponse.json(
      { error: e.message ?? 'Failed to open question', code: e.code },
      { status: e.status ?? 500 },
    )
  }
})
