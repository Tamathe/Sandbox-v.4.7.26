/**
 * POST /api/sandcastle/rooms/[roomId]/canvas/stroke
 *
 * Appends a stroke to the room canvas and broadcasts via the room bus.
 * Auth: HOST or PARTICIPANT (any authenticated room member).
 * Validation: points array ≤ 500 items, payload ≤ 64 KB.
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { appendStroke, type CanvasStroke } from '../../../../../../lib/sandcastle/canvas-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  // Payload size guard (64 KB)
  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10)
  if (contentLength > 65536) {
    return Response.json({ error: 'Payload too large (max 64 KB)' }, { status: 413 })
  }

  const { roomId } = await params
  const parsed = await parseRequestBody<{ stroke?: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  const stroke = body.stroke as CanvasStroke

  if (!stroke || typeof stroke !== 'object') {
    return Response.json({ error: 'stroke is required' }, { status: 400 })
  }
  if (!Array.isArray(stroke.points) || stroke.points.length === 0) {
    return Response.json({ error: 'stroke.points must be a non-empty array' }, { status: 400 })
  }
  if (stroke.points.length > 500) {
    return Response.json({ error: 'stroke.points exceeds 500-point limit' }, { status: 400 })
  }

  await appendStroke(roomId, stroke)
  return Response.json({ ok: true })
})
