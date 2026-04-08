import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getInterviewPrompt, type DataDeskInterviewRequest } from '../../../../lib/data-desk-elevation-service'
import { streamHaikuInterview } from '../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<DataDeskInterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { messages, preflight, interviewState } = body
  if (!messages || !preflight || !interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  body.toolSlug = 'survey-analyzer' as DataDeskInterviewRequest['toolSlug']

  const systemPrompt = getInterviewPrompt(body)

  return streamHaikuInterview(systemPrompt, messages)
})
