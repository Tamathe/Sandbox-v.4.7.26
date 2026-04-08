// ─── Morning Briefing API ────────────────────────────────────
// GET /api/briefing — returns Sandy's daily briefing with AI-triaged email,
// annotated calendar, and task overview.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { getBriefing } from '../../lib/briefing-service'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  try {
    const briefing = await getBriefing(auth.user.id)
    return NextResponse.json(briefing, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[briefing] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
})
