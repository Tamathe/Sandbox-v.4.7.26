import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getInterviewPrompt } from '../../../lib/clinical-trial-matcher/interview-service'
import type { MatcherPreflight, MatcherInterviewState } from '../../../lib/clinical-trial-matcher/types'
import { streamHaikuInterview } from '../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { messages: { role: 'user' | 'assistant'; content: string }[]; preflight: MatcherPreflight; interviewState: MatcherInterviewState }
  const { messages, preflight, interviewState } = body

  const systemPrompt = getInterviewPrompt({ preflight, interviewState })

  return streamHaikuInterview(systemPrompt, messages, { maxTokens: 1024 })
})
