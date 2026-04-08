import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getReputationPulsePreflight } from '../../../../lib/crisis-comms/reputation-pulse/preflight'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  try {
    const preflight = await getReputationPulsePreflight(auth.user.id)
    return NextResponse.json(preflight, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Reputation pulse preflight error:', error)
    return NextResponse.json({ error: 'Failed to load preflight data' }, { status: 500 })
  }
})
