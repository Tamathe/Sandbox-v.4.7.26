import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getStudentJourney } from '../../../lib/journey/journey-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const weeks = parseInt(req.nextUrl.searchParams.get('weeks') || '16')
  const layer = req.nextUrl.searchParams.get('layer') || undefined

  const journey = await getStudentJourney(auth.user.id, { weeks, layer })
  return NextResponse.json(journey, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
