/**
 * GET /api/sandcastle/rooms/[roomId]/scoreboard
 *
 * Returns the current Game Show scoreboard.
 * Any authenticated participant (or admin) can fetch it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { getScoreboard } from '../../../../../lib/sandcastle/game-show-service'
import { prisma } from '../../../../../lib/prisma'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const scoreboard = await getScoreboard(roomId)
  return NextResponse.json({ scoreboard }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
