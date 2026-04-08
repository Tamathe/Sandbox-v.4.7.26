/**
 * GET /api/sandcastle/rooms/[roomId]/polls/[pollId]/insight
 *
 * Returns the AI-generated insight for a closed poll.
 * Returns { status: 'PENDING' } while insight is still generating.
 *
 * Auth: HOST only
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { prisma } from '../../../../../../../lib/prisma'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; pollId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId, pollId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { roomId: true },
  })
  if (!poll || poll.roomId !== roomId) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const insight = await prisma.pollInsight.findUnique({ where: { pollId } })
  if (!insight) {
    return NextResponse.json({ status: 'PENDING' }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  return NextResponse.json({
    pollId: insight.pollId,
    insightText: insight.insightText,
    generatedAt: insight.generatedAt.toISOString(),
  })
})
