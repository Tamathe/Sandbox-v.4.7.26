import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { answerPolicyQuestion } from '../../../../lib/staff/policy-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { question, category } = parsed.data as {
    question: string
    category?: string
  }

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const result = await answerPolicyQuestion(question, {
    category: category || undefined,
    userId: auth.user.id,
  })

  return NextResponse.json(result)
})
