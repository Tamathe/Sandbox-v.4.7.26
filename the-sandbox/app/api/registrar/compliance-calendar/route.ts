import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure } from '../../../lib/server-auth'
import { getComplianceCalendar } from '../../../lib/registrar/compliance-calendar'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  try {
    const data = await getComplianceCalendar()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('Compliance calendar error:', err)
    return NextResponse.json({ error: 'Failed to load compliance calendar' }, { status: 500 })
  }
})
