import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'
import { getWeatherMap } from '../../lib/weather-map/weather-map-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const map = await getWeatherMap()
  return NextResponse.json(map, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
