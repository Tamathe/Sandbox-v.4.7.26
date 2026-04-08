import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../lib/server-auth'
import { startQuiz } from '../../../../lib/quiz-bowl'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { quizId } = await params

  try {
    const quiz = await startQuiz(quizId, auth.user.id)
    return NextResponse.json({ quiz })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
