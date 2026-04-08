import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getInterviewSystemPrompt, type IdeaInterviewRequest } from '../../../../lib/innovation-lab-service'
import { streamHaikuInterview } from '../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<IdeaInterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { messages, preflight, interviewState } = body
  if (!messages || !preflight || !interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = getInterviewSystemPrompt(preflight, interviewState)

  return streamHaikuInterview(systemPrompt, messages, { maxTokens: 768 })
})
