import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { scoreVoiceSession } from '../../../../../lib/audio/voice-session-service'
import type { ScoreDimension } from '../../../../../lib/audio/types'

export const POST = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { scores } = parsed.data as { scores: ScoreDimension[] }
  if (!Array.isArray(scores)) return NextResponse.json({ error: 'scores array required' }, { status: 400 })
  await scoreVoiceSession(id, scores)
  return NextResponse.json({ ok: true })
})
