import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getInterviewSystemPrompt, type InstitutionalResumeInterviewRequest } from '../../../../lib/institutional-resume-service'
import { streamHaikuInterview } from '../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as InstitutionalResumeInterviewRequest

  if (!body.messages || !body.preflight || !body.interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = getInterviewSystemPrompt(body.preflight, body.interviewState)

  return streamHaikuInterview(systemPrompt, body.messages)
})
