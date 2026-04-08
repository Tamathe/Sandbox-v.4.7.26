/**
 * GET /api/sandcastle/rooms/[roomId]/canvas
 *
 * Returns the current stroke list for late-joiners to hydrate their canvas.
 * Auth: any authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { getCanvasStrokes } from '../../../../../lib/sandcastle/canvas-service'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params
  const strokes = await getCanvasStrokes(roomId)
  return NextResponse.json({ strokes }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
