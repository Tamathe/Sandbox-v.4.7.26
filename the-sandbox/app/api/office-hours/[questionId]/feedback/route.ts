import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { z } from 'zod'
import { submitFeedback } from '../../../../lib/office-hours-service'
import { withErrorHandling } from '../../../../lib/api-utils'

const FeedbackSchema = z.object({
  helpful: z.boolean(),
})

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { questionId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(FeedbackSchema, parsed.data)
    if ('error' in v) return v.error

    await submitFeedback(questionId, auth.user.id, v.value.helpful)
    return NextResponse.json({ success: true })
  })
