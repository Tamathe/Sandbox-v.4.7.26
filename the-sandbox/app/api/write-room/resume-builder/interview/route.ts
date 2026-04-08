import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getInterviewSystemPrompt, type ResumeInterviewRequest } from '../../../../lib/resume-builder-service'
import { streamHaikuInterview } from '../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<ResumeInterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { messages, preflight, interviewState } = body
  if (!messages || !preflight || !interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = getInterviewSystemPrompt(preflight, interviewState)

  return streamHaikuInterview(systemPrompt, messages)
})
