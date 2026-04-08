import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { refreshAllBuildingProfiles } from '../../../lib/weather-map/building-profile-engine'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const start = Date.now()
  const result = await refreshAllBuildingProfiles()

  return NextResponse.json({
    ...result,
    durationMs: Date.now() - start,
  })
})
