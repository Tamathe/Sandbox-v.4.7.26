import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../lib/server-auth'
import { advanceQuestion } from '../../../../lib/quiz-bowl'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { quizId } = await params

  try {
    const result = await advanceQuestion(quizId, auth.user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to advance'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
