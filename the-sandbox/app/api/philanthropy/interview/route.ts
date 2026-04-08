import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getInterviewPrompt } from '../../../lib/philanthropy/interview-service'
import { streamHaikuInterview } from '../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    messages: { role: 'user' | 'assistant'; content: string }[]
    context: Parameters<typeof getInterviewPrompt>[0]
  }>(req)
  if ('error' in parsed) return parsed.error
  const { messages, context } = parsed.data

  if (!messages || !context) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = getInterviewPrompt(context)

  return streamHaikuInterview(systemPrompt, messages, { maxTokens: 1024, timeoutMs: 60_000 })
})
