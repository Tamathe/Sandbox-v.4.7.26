import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../lib/server-auth'
import { joinQuiz } from '../../../../lib/quiz-bowl'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { quizId } = await params
  const parsed = await parseRequestBody<{ displayName: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { displayName } = parsed.data

  if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
    return NextResponse.json({ error: 'displayName required' }, { status: 400 })
  }

  try {
    const player = await joinQuiz(quizId, auth.user.id, displayName.trim())
    return NextResponse.json({ player }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
