import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { upsertMatchProfile, getMatchProfile } from '../../../lib/study-match-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const profile = await getMatchProfile(user.id)
    return NextResponse.json({ profile }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { optedIn: boolean; availableHours?: Record<string, string[]>; preferredSize?: number }

    if (typeof body.optedIn !== 'boolean') {
      return NextResponse.json({ error: 'optedIn (boolean) is required' }, { status: 400 })
    }

    const profile = await upsertMatchProfile(user.id, body)
    return NextResponse.json({ profile }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
