import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { submitPracticeExam } from '../../../../lib/exam-forge-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const { examId } = await params

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { answers: { questionId: string; answer: string }[] }

    if (!Array.isArray(body.answers)) {
      return NextResponse.json({ error: 'answers array is required' }, { status: 400 })
    }

    const result = await submitPracticeExam(examId, user.id, body.answers)
    return NextResponse.json(result)
  })
