import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getInterviewSystemPrompt,
  type InterviewRequest,
} from '../../../../lib/email-rewriter-service'
import { streamHaikuInterview } from '../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<InterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { messages, originalEmail, intent, preflight } = body
  if (!messages || !originalEmail || !intent || !preflight) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = getInterviewSystemPrompt(originalEmail, intent, preflight)

  return streamHaikuInterview(systemPrompt, messages)
})
