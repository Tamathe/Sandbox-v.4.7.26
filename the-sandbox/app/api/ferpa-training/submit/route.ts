import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { evaluateQuiz } from '../../../lib/ferpa-training-service'
import type { FerpaQuestion } from '../../../lib/ferpa-training-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const parsed = await parseRequestBody<{ questions?: FerpaQuestion[]; selectedIndices?: number[] }>(request)
  if ('error' in parsed) return parsed.error

  const { questions, selectedIndices } = parsed.data
  if (!Array.isArray(questions) || questions.length !== 5) {
    return NextResponse.json({ error: 'questions must be an array of 5 items' }, { status: 400 })
  }
  if (!Array.isArray(selectedIndices) || selectedIndices.length !== 5) {
    return NextResponse.json({ error: 'selectedIndices must be an array of 5 items' }, { status: 400 })
  }

  try {
    const result = await evaluateQuiz(user.id, user.email, questions, selectedIndices)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[ferpa-training/submit]', error)
    return NextResponse.json({ error: 'Failed to evaluate quiz' }, { status: 500 })
  }
})
