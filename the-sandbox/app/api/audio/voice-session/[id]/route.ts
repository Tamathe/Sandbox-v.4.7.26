import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getVoiceSession, updateVoiceSession } from '../../../../lib/audio/voice-session-service'
import type { TranscriptEntry, CheckpointResult } from '../../../../lib/audio/types'

export const GET = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const session = await getVoiceSession(id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  return NextResponse.json(session, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const session = await updateVoiceSession(id, parsed.data as {
    transcript?: TranscriptEntry[]
    status?: string
    durationSecs?: number
    summary?: string
    checkpointResults?: CheckpointResult[]
  })
  return NextResponse.json(session, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
