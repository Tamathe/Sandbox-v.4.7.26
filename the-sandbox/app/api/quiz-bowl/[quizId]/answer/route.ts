import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../lib/server-auth'
import { submitAnswer } from '../../../../lib/quiz-bowl'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { quizId } = await params
  const parsed = await parseRequestBody<{ questionId: unknown; selectedIndex: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { questionId, selectedIndex } = parsed.data

  if (!questionId || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'questionId required' }, { status: 400 })
  }
  if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex > 3) {
    return NextResponse.json({ error: 'selectedIndex must be 0-3' }, { status: 400 })
  }

  try {
    const result = await submitAnswer(quizId, questionId, auth.user.id, selectedIndex)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit answer'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
