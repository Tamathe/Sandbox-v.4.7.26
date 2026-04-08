/**
 * GET /api/analytics/curriculum-signals
 *
 * Returns platform-wide concept transfer signals. ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getCurriculumSignals } from '../../../lib/curriculum-signal-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req, { requireAdmin: true })
  if (isAuthFailure(auth)) return auth.response

  const result = await getCurriculumSignals()
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  })
})
