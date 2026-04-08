import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getDiningMenu } from '../../../lib/dining-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const locationId = req.nextUrl.searchParams.get('location')
  const meal = req.nextUrl.searchParams.get('meal') || undefined
  if (!locationId) return NextResponse.json({ error: 'location required' }, { status: 400 })
  const menu = await getDiningMenu(locationId, meal)
  return NextResponse.json(menu || { items: [], note: 'Menu data not available in static mode' }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
