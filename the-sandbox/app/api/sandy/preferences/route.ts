import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getPreferences, updatePreferences, VALID_TONES, VALID_PROACTIVITY, VALID_LENGTH } from '../../../lib/sandy-preferences-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const prefs = await getPreferences(auth.user.id)
  return NextResponse.json({
    preferences: prefs,
    options: {
      tone: [...VALID_TONES],
      proactivityLevel: [...VALID_PROACTIVITY],
      responseLength: [...VALID_LENGTH],
    },
  })
})

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Record<string, unknown>
  try {
    const updated = await updatePreferences(auth.user.id, body)
    return NextResponse.json({ preferences: updated }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid input'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
