import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getScenario, generateScenario } from '../../../lib/output-eval-service'
import { getStudentScenarios } from '../../../lib/ai-literacy/student-output-detective-service'
import type { DisciplineFamilyKey } from '../../../lib/ai-literacy/student-output-detective-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const context = req.nextUrl.searchParams.get('context')

  // Student context: return discipline-filtered student scenarios
  if (context === 'student') {
    const discipline = req.nextUrl.searchParams.get('discipline') as DisciplineFamilyKey | null
    const tierParam = req.nextUrl.searchParams.get('tier')
    const tier = tierParam ? Number(tierParam) : undefined

    const scenarios = getStudentScenarios(discipline ?? undefined, tier)
    return NextResponse.json({ scenarios }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Educator context (default): single random scenario
  const tier = Number(req.nextUrl.searchParams.get('tier') ?? '1')
  if (isNaN(tier) || tier < 1 || tier > 3) {
    return NextResponse.json({ error: 'Invalid tier (1-3)' }, { status: 400 })
  }

  const excludeParam = req.nextUrl.searchParams.get('exclude') ?? ''
  const excludeIds = excludeParam ? excludeParam.split(',').filter(Boolean) : []

  let scenario = getScenario(tier, excludeIds)
  if (!scenario) {
    scenario = await generateScenario(tier)
  }

  return NextResponse.json({ scenario }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
