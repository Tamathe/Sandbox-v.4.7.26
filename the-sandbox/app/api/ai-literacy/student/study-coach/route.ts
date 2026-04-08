import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import {
  startSession,
  getUserSessions,
} from '../../../../lib/ai-literacy/study-coach-service'
import { getOrCreateProfile } from '../../../../lib/ai-literacy/student-literacy-profile-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const sessions = await getUserSessions(auth.user.id)
  return NextResponse.json({ sessions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { topic: string; courseId?: string }
  const { topic, courseId } = body

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
  }

  // Infer discipline from profile if available
  let disciplineFamily = null
  try {
    const profile = await getOrCreateProfile(auth.user.id)
    disciplineFamily = profile.disciplineFamily
  } catch {
    // Profile doesn't exist yet — that's fine
  }

  const session = await startSession(
    auth.user.id,
    topic.trim(),
    courseId || undefined,
    disciplineFamily || undefined,
  )

  return NextResponse.json({ session: { id: session.id, topic: session.topic, courseId: session.courseId } })
})
