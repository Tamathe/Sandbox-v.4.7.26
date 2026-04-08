import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { enterResult } from '../../../../../lib/bracket/bracket-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody<{ gameId: unknown; winnerId: unknown; round: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { gameId, winnerId, round } = parsed.data

  if (!gameId || !winnerId || round === undefined || round === null) {
    return NextResponse.json({ error: 'gameId, winnerId, and round are required' }, { status: 400 })
  }

  if (typeof gameId !== 'string' || typeof winnerId !== 'string' || typeof round !== 'number') {
    return NextResponse.json({ error: 'gameId and winnerId must be strings; round must be a number' }, { status: 400 })
  }

  try {
    await enterResult(id, auth.user.id, gameId, winnerId, round)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    if (msg.includes('Only the commissioner')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
