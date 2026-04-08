import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { getDiningStatus } from '../../lib/dining-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const statuses = await getDiningStatus()
  return NextResponse.json(statuses, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
