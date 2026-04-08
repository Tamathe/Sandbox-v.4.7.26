import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { saveDrillResult } from '../../../../lib/crisis-comms/spokesperson-trainer/scoring-service'
import type { SaveDrillRequest } from '../../../../lib/crisis-comms/spokesperson-trainer/types'
import { withErrorHandling } from '../../../../lib/api-utils'

function isValidScore(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 10
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as SaveDrillRequest
  const { scenarioTitle, difficulty, scores, questionsAnswered, keyMessages } = body
  if (!scenarioTitle || !difficulty || !scores) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate score ranges
  if (
    !isValidScore(scores.clarity) ||
    !isValidScore(scores.empathy) ||
    !isValidScore(scores.speculationControl) ||
    !isValidScore(scores.messageDiscipline)
  ) {
    return NextResponse.json({ error: 'Scores must be between 1 and 10' }, { status: 400 })
  }

  // Validate difficulty
  if (!['warmup', 'standard', 'hostile', 'press-conference'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
  }

  try {
    const sessionId = await saveDrillResult({
      userId: auth.user.id,
      scenarioTitle,
      difficulty,
      scores,
      questionsAnswered: Math.max(0, Math.round(questionsAnswered ?? 0)),
      keyMessages: Array.isArray(keyMessages) ? keyMessages : undefined,
    })
    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Spokesperson trainer save error:', error)
    return NextResponse.json({ error: 'Failed to save drill' }, { status: 500 })
  }
})
