import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getInterviewPrompt } from '../../../../lib/crisis-comms/reputation-pulse/interview-service'
import { streamHaikuInterview } from '../../../../lib/streaming'
import type { RepPulseInterviewRequest } from '../../../../lib/crisis-comms/reputation-pulse/types'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<RepPulseInterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { messages, preflight, interviewState } = body
  if (!messages || !preflight || !interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = getInterviewPrompt(body)

  return streamHaikuInterview(systemPrompt, messages, { maxTokens: 1024 })
})
