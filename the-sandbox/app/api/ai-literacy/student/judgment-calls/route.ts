import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import {
  getAvailableScenarios,
  getUserAttempts,
} from '../../../../lib/ai-literacy/judgment-calls-service'
import type { DisciplineFamily, ScenarioDifficulty } from '../../../../generated/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const discipline = url.searchParams.get('discipline') as DisciplineFamily | null
  const difficulty = url.searchParams.get('difficulty') as ScenarioDifficulty | null

  const scenarios = await getAvailableScenarios(
    discipline ?? undefined,
    difficulty ?? undefined,
  )

  const scenarioIds = scenarios.map((s) => s.id)
  const userAttempts = await getUserAttempts(auth.user.id, scenarioIds)

  return NextResponse.json({ scenarios, userAttempts }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
