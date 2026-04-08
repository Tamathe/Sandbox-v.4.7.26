import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getHoldsManagement } from '../../../lib/registrar/holds-management'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const data = await getHoldsManagement()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
