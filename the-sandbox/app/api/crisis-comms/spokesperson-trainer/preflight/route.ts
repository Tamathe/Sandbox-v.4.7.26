import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getSpokespersonTrainerPreflight } from '../../../../lib/crisis-comms/spokesperson-trainer/preflight'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  try {
    const preflight = await getSpokespersonTrainerPreflight(auth.user.id)
    return NextResponse.json(preflight, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Spokesperson trainer preflight error:', error)
    return NextResponse.json({ error: 'Failed to load preflight' }, { status: 500 })
  }
})
