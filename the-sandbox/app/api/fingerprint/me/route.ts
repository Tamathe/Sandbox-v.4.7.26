import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getFingerprint } from '../../../lib/fingerprint/fingerprint-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const fingerprint = await getFingerprint(auth.user.id)

  if (!fingerprint) {
    return NextResponse.json({ fingerprint: null, message: 'Not enough data yet' })
  }

  return NextResponse.json({ fingerprint }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
