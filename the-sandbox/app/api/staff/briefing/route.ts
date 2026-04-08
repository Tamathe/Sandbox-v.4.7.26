import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getDailyBriefing, getDailyBriefingDelta } from '../../../lib/staff/briefing-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const mode = req.nextUrl.searchParams.get('mode') ?? 'full'
  const since = req.nextUrl.searchParams.get('since')

  if (mode === 'delta') {
    if (!since || isNaN(Date.parse(since))) {
      return NextResponse.json(
        { error: 'Missing or invalid since parameter' },
        { status: 400 },
      )
    }
    const delta = await getDailyBriefingDelta(auth.user.id, since)
    return NextResponse.json({ delta }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  const briefing = await getDailyBriefing(auth.user.id)
  return NextResponse.json({ briefing }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
