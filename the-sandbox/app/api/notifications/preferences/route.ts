import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  getPreferences,
  updatePreferences,
  NOTIFICATION_TYPE_LABELS,
} from '../../../lib/notification-preference-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const preferences = await getPreferences(auth.user.id)

  return NextResponse.json({ preferences, labels: NOTIFICATION_TYPE_LABELS }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    preferences?: { type: string; enabled: boolean; channel: string }[]
  }

  if (!body.preferences || !Array.isArray(body.preferences)) {
    return NextResponse.json(
      { error: 'preferences array is required' },
      { status: 400 }
    )
  }

  const updated = await updatePreferences(auth.user.id, body.preferences)

  return NextResponse.json({ preferences: updated })
})
