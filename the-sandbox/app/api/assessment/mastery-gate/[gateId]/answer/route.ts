import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { answerMasteryGateQuestion } from '../../../../../lib/assessment/mastery-gate-service'
import {
  isAuthFailure,
  parseRequestBody,
  requireRequestUser,
} from '../../../../../lib/server-auth'

export const runtime = 'nodejs'

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ gateId: string }> }) => {
    const { gateId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    const parsed = await parseRequestBody<{
      attemptId?: string
      answer?: string
    }>(req)
    if ('error' in parsed) return parsed.error

    const attemptId = parsed.data.attemptId?.trim()
    const answer = parsed.data.answer?.trim()

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 })
    }

    if (!answer) {
      return NextResponse.json({ error: 'answer is required' }, { status: 400 })
    }

    return NextResponse.json(
      await answerMasteryGateQuestion(
        {
          id: user.id,
          role: user.role,
        },
        gateId,
        attemptId,
        answer
      )
    )
  }
)
