import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { analyzeDraftPatterns } from '../../../../lib/assistant/email-rule-learner'

/**
 * GET /api/assistant/email/suggest-rules
 * Check if draft approval patterns have emerged that could become rules.
 * Called after draft approval to show "Sandy noticed a pattern" banner.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const patterns = await analyzeDraftPatterns(auth.user.id)
  return NextResponse.json({ patterns }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
