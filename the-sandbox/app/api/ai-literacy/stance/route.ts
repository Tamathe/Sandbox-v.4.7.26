import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getStanceProfile, submitAssessment, updateStanceManually, STANCE_QUESTIONS } from '../../../lib/stance-service'
import { recalculateProfile } from '../../../lib/progressive-profile-service'
import type { AIStance, DisciplineFamily } from '../../../generated/prisma'

// GET — current stance profile + questions
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const profile = await getStanceProfile(auth.user.id)
  return NextResponse.json({ ...profile, questions: STANCE_QUESTIONS })
})

// POST — submit assessment or manual stance update
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    manualStance?: string
    rationale?: string
    responses?: { questionId: string; selectedValue: number; optionLabel: string }[]
    disciplineFamily?: DisciplineFamily
    reflectionNote?: string
  }

  // Manual stance update (no assessment)
  if (body.manualStance) {
    const validStances = ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE']
    if (!validStances.includes(body.manualStance)) {
      return NextResponse.json({ error: 'Invalid stance' }, { status: 400 })
    }
    await updateStanceManually(auth.user.id, body.manualStance as AIStance, body.rationale)
    void recalculateProfile(auth.user.id)
    return NextResponse.json({ stance: body.manualStance, manual: true })
  }

  // Assessment submission
  if (!body.responses || !Array.isArray(body.responses) || body.responses.length !== 10) {
    return NextResponse.json({ error: 'Must provide exactly 10 responses' }, { status: 400 })
  }

  const result = await submitAssessment(auth.user.id, {
    responses: body.responses,
    disciplineFamily: body.disciplineFamily,
    reflectionNote: body.reflectionNote,
  })
  void recalculateProfile(auth.user.id)

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
