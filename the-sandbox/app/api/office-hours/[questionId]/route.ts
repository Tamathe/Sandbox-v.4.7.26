import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'
import { respondToQuestion } from '../../../lib/office-hours-service'
import { withErrorHandling } from '../../../lib/api-utils'

const RespondSchema = z.object({
  answer: z.string().min(1),
})

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { questionId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(RespondSchema, parsed.data)
    if ('error' in v) return v.error

    await respondToQuestion(questionId, auth.user.id, v.value.answer)
    return NextResponse.json({ success: true })
  })
