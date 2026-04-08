import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getSentimentInterviewPrompt, type SentimentAnalyzerInterviewRequest } from '../../../../lib/sentiment-analyzer-service'
import { streamHaikuInterview } from '../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as SentimentAnalyzerInterviewRequest
  if (!body.messages || !body.preflight) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const systemPrompt = getSentimentInterviewPrompt(body)

  return streamHaikuInterview(systemPrompt, body.messages)
})
