/**
 * Student join endpoint — creates a Participant record and returns participantId.
 * REST alternative to the WS JOIN_ROOM message for Phase 1.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { addParticipant } from '../../../../../lib/sandcastle/room-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const body = await parseRequestBody<{ displayName?: string; avatarSeed?: string }>(request)
  if ('error' in body) return body.error

  const { displayName, avatarSeed } = body.data
  if (!displayName || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 })
  }
  if (displayName.trim().length > 60) {
    return NextResponse.json({ error: 'displayName must be 60 characters or fewer' }, { status: 400 })
  }

  try {
    const result = await addParticipant(roomId, auth.user.id, displayName.trim(), avatarSeed)
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string }
    return NextResponse.json(
      { error: e.message ?? 'Failed to join room', code: e.code },
      { status: e.status ?? 500 },
    )
  }
})
