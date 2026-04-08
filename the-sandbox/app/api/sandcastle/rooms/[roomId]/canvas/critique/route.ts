/**
 * POST /api/sandcastle/rooms/[roomId]/canvas/critique
 *
 * Triggers a Haiku AI critique of the canvas snapshot (fire-and-forget).
 * Rate-limited to 1 per room per 30 s via Redis TTL key.
 * Auth: HOST only.
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { requestCritique } from '../../../../../../lib/sandcastle/canvas-service'

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

  const parsed = await parseRequestBody<{ snapshotDataUrl?: string; prompt?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (!body.snapshotDataUrl || typeof body.snapshotDataUrl !== 'string') {
    return Response.json({ error: 'snapshotDataUrl is required' }, { status: 400 })
  }

  const result = await requestCritique(
    roomId,
    body.snapshotDataUrl,
    body.prompt,
    auth.user.id,
  )

  if (!result.queued) {
    return Response.json(
      { error: 'Rate limited — try again shortly', retryAfterMs: result.retryAfterMs },
      { status: 429 },
    )
  }

  return Response.json({ queued: true })
})
