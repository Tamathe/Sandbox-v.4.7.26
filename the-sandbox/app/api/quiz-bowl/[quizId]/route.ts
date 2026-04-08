import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../lib/server-auth'
import { getQuiz } from '../../../lib/quiz-bowl'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { quizId } = await params
  const quiz = await getQuiz(quizId, auth.user.id)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ quiz }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
