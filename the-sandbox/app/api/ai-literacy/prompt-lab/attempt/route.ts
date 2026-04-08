import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { saveAttempt } from '../../../../lib/prompt-lab-service'
import { recalculateProfile } from '../../../../lib/progressive-profile-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { challengeId: string; level: number; originalPrompt: string; userPrompt: string; originalOutput?: string; userOutput?: string; scores?: Record<string, number>; overallScore?: number; feedback?: string; context?: string; disciplineFamily?: string }
  const { challengeId, level, originalPrompt, userPrompt, originalOutput, userOutput, scores, overallScore, feedback, context, disciplineFamily } = body

  if (!challengeId || !originalPrompt || !userPrompt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const attempt = await saveAttempt(auth.user.id, {
    challengeId,
    level: Number(level),
    originalPrompt,
    userPrompt,
    originalOutput: originalOutput ?? '',
    userOutput: userOutput ?? '',
    scores: scores ?? {},
    overallScore: Number(overallScore) || 0,
    feedback: feedback ?? '',
    ...(context ? { context } : {}),
    ...(disciplineFamily ? { disciplineFamily } : {}),
  })
  void recalculateProfile(auth.user.id)
  return NextResponse.json(attempt)
})
