import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { streamHaikuInterview } from '../../../../lib/streaming'
import { getInterviewPrompt, type WellnessInterviewRequest } from '../../../../lib/wellness-hub-elevation-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<WellnessInterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { messages, preflight, interviewState } = body
  if (!messages || !preflight || !interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  body.toolSlug = 'habits' as WellnessInterviewRequest['toolSlug']

  const systemPrompt = getInterviewPrompt(body)

  return streamHaikuInterview(systemPrompt, messages)
})
