import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getStaleThreads } from '../../../../lib/assistant/email-followup-service'

/**
 * GET /api/assistant/email/follow-ups
 * Find approved drafts where the recipient hasn't replied.
 * Query params: ?thresholdDays=3 (default 3)
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const thresholdDays = Number(req.nextUrl.searchParams.get('thresholdDays')) || 3
  const candidates = await getStaleThreads(auth.user.id, thresholdDays)
  return NextResponse.json({ candidates }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
