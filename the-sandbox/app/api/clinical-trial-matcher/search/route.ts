import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { searchTrials } from '../../../lib/clinical-trial-matcher/clinical-trials-api'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { condition, intervention, age, sex } = parsed.data as { condition: string; intervention?: string; age?: number; sex?: string }

  if (!condition) {
    return NextResponse.json({ error: 'Condition is required' }, { status: 400 })
  }

  const trials = await searchTrials({
    condition,
    intervention: intervention || undefined,
    status: ['RECRUITING', 'ENROLLING_BY_INVITATION', 'NOT_YET_RECRUITING'],
    ageRange: age ? { min: age, max: age } : undefined,
    sex: sex || undefined,
    pageSize: 20,
  })

  return NextResponse.json({ trials, count: trials.length })
})
