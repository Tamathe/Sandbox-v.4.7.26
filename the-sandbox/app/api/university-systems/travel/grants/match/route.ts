import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { matchGrantsToTrip } from '../../../../../lib/university-systems-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { tripDescription } = parsed.data as { tripDescription?: string }

  if (!tripDescription) {
    return NextResponse.json({ error: 'tripDescription is required' }, { status: 400 })
  }

  const result = await matchGrantsToTrip(tripDescription)
  return NextResponse.json(result)
})
