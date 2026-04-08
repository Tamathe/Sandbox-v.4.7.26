import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { submitFeedback, getUserFeedback } from '../../../lib/contribute/contribute-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const feedback = await getUserFeedback(user.id)
  return NextResponse.json(feedback, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { targetType, targetId, feedbackType, content } = parsed.data as {
    targetType: string; targetId: string; feedbackType: string; content: string
  }

  if (!targetType || !targetId || !feedbackType || !content?.trim()) {
    return NextResponse.json({ error: 'targetType, targetId, feedbackType, and content are required' }, { status: 400 })
  }

  const feedback = await submitFeedback(user.id, {
    targetType: targetType as 'TOOL' | 'COURSE' | 'MICRO_COURSE' | 'SIMULATION',
    targetId,
    feedbackType: feedbackType as 'CLARITY' | 'ACCURACY' | 'RELEVANCE' | 'DIFFICULTY' | 'SUGGESTION',
    content: content.trim(),
  })
  return NextResponse.json(feedback, { status: 201 })
})
