/**
 * POST /api/sandcastle/rooms/[roomId]/questions/[questionId]/buzz
 *
 * Records a buzzer press for a student participant.
 * Body: { participantId: string; clientTimestampMs?: number }
 * Returns: { won: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { recordBuzzerPress } from '../../../../../../../lib/sandcastle/game-show-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; questionId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId, questionId } = await params

  const parsed = await parseRequestBody<{ participantId?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  if (!body.participantId) {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
  }

  try {
    const result = await recordBuzzerPress(
      questionId,
      roomId,
      body.participantId,
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string }
    return NextResponse.json(
      { error: e.message ?? 'Failed to record buzz', code: e.code },
      { status: e.status ?? 500 },
    )
  }
})
