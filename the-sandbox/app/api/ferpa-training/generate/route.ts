import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { generateFerpaQuiz } from '../../../lib/ferpa-training-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  try {
    const questions = await generateFerpaQuiz()
    return NextResponse.json({ questions })
  } catch (error) {
    console.error('[ferpa-training/generate]', error)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
})
