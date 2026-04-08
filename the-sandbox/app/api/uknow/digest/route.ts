import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { getDigestPreference, setDigestPreference } from '../../../lib/uknow-alert-service'
import { withErrorHandling } from '../../../lib/api-utils'

const VALID_FREQUENCIES = ['DAILY', 'WEEKLY', 'OFF'] as const

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const frequency = await getDigestPreference(auth.user.id)
    return NextResponse.json({ frequency }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const PUT = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { frequency?: string }
    const frequency: string | undefined = body?.frequency

    if (!frequency || !VALID_FREQUENCIES.includes(frequency as typeof VALID_FREQUENCIES[number])) {
      return NextResponse.json(
        { error: 'frequency must be one of: DAILY, WEEKLY, OFF' },
        { status: 400 }
      )
    }

    await setDigestPreference(auth.user.id, frequency)
    return NextResponse.json({ frequency }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
