import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { createVoiceSession, listVoiceSessions } from '../../../lib/audio/voice-session-service'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const sessions = await listVoiceSessions(auth.user.id)
  return NextResponse.json({ sessions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { type, scenarioId, courseId, topicTags } = parsed.data as {
    type: VoiceTutoringMode
    scenarioId?: string
    courseId?: string
    topicTags?: string[]
  }
  if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 })
  const session = await createVoiceSession(auth.user.id, type, { scenarioId, courseId, topicTags })
  return NextResponse.json(session, { status: 201 })
})
