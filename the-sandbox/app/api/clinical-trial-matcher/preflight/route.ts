import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getClinicalTrialMatcherPreflight } from '../../../lib/clinical-trial-matcher/preflight'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const preflight = await getClinicalTrialMatcherPreflight(auth.user.id)
  return NextResponse.json(preflight, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
