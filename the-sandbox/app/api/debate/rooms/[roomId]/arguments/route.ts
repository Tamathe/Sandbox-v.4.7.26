import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { submitArgument } from '../../../../../lib/debate'
import type { DebateSide } from '../../../../../generated/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody<{ side: unknown; claim: unknown; evidence: unknown; reasoning: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { side, claim, evidence, reasoning } = parsed.data

  if (!side || (side !== 'PRO' && side !== 'CON')) {
    return NextResponse.json({ error: 'side must be PRO or CON' }, { status: 400 })
  }
  if (!claim || typeof claim !== 'string' || !claim.trim()) {
    return NextResponse.json({ error: 'claim is required' }, { status: 400 })
  }
  if (!evidence || typeof evidence !== 'string' || !evidence.trim()) {
    return NextResponse.json({ error: 'evidence is required' }, { status: 400 })
  }
  if (!reasoning || typeof reasoning !== 'string' || !reasoning.trim()) {
    return NextResponse.json({ error: 'reasoning is required' }, { status: 400 })
  }

  try {
    const argument = await submitArgument(
      roomId,
      auth.user.id,
      side as DebateSide,
      claim.trim(),
      evidence.trim(),
      reasoning.trim()
    )
    return NextResponse.json({ argument }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit argument'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
