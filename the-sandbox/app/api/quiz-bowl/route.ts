import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../lib/server-auth'
import { listQuizzesForUser, createQuiz } from '../../lib/quiz-bowl'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const quizzes = await listQuizzesForUser(auth.user.id)
  return NextResponse.json({ quizzes }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const parsed = await parseRequestBody<{ title: unknown; topic: unknown; questionCount: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { title, topic, questionCount } = parsed.data

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 })
  }

  const count = Math.max(1, Math.min(10, Number(questionCount) || 5))
  const quiz = await createQuiz(auth.user.id, title.trim(), topic.trim(), count)

  return NextResponse.json({ quiz }, { status: 201 })
})
