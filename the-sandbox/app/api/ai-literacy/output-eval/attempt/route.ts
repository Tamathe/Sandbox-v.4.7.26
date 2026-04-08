import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { saveAttempt } from '../../../../lib/output-eval-service'
import { recalculateProfile } from '../../../../lib/progressive-profile-service'
import { recalculateStudentProfile } from '../../../../lib/ai-literacy/student-literacy-profile-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { scenarioId: string; tier: number; question: string; aiResponse: string; plantedErrors?: unknown[]; userHighlights?: unknown[]; userRating?: number; detectionScore?: number; justificationScore?: number; overallScore?: number; feedback?: string; isSeeded?: boolean; context?: string; disciplineFamily?: string }
  const { scenarioId, tier, question, aiResponse, plantedErrors, userHighlights, userRating, detectionScore, justificationScore, overallScore, feedback, isSeeded, context, disciplineFamily } = body

  if (!scenarioId || !question || !aiResponse) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const attempt = await saveAttempt(auth.user.id, {
    scenarioId,
    tier: Number(tier),
    question,
    aiResponse,
    plantedErrors: plantedErrors ?? [],
    userHighlights: userHighlights ?? [],
    userRating: Number(userRating) || 0,
    detectionScore: Number(detectionScore) || 0,
    justificationScore: Number(justificationScore) || 0,
    overallScore: Number(overallScore) || 0,
    feedback: feedback ?? '',
    isSeeded: isSeeded ?? true,
    ...(context ? { context } : {}),
    ...(disciplineFamily ? { disciplineFamily } : {}),
  })
  if (context === 'student') {
    void recalculateStudentProfile(auth.user.id)
  } else {
    void recalculateProfile(auth.user.id)
  }
  return NextResponse.json(attempt)
})
