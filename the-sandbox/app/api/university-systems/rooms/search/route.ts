import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { searchAvailableRooms } from '../../../../lib/university-systems-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const date = req.nextUrl.searchParams.get('date')
  const startTime = req.nextUrl.searchParams.get('startTime')
  const endTime = req.nextUrl.searchParams.get('endTime')
  const capacity = req.nextUrl.searchParams.get('capacity')
  const building = req.nextUrl.searchParams.get('building')

  if (!date || !startTime || !endTime) {
    return NextResponse.json({ error: 'date, startTime, and endTime are required' }, { status: 400 })
  }

  const result = await searchAvailableRooms({
    date,
    startTime,
    endTime,
    capacity: capacity ? parseInt(capacity, 10) : undefined,
    building: building ?? undefined,
  })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
