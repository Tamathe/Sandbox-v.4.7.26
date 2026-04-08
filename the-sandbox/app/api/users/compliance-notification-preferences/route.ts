import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getPreferences, updatePreferences } from '../../../lib/compliance-notification-prefs-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const prefs = await getPreferences(auth.user.id)
  return NextResponse.json(prefs, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    channel?: string
    consentReminders?: boolean
    ferpaAlerts?: boolean
    policyUpdates?: boolean
    incidentNotifications?: boolean
    trainingReminders?: boolean
    digestFrequency?: string
  }>(request)
  if ('error' in body) return body.error

  const prefs = await updatePreferences(auth.user.id, body.data)
  return NextResponse.json(prefs, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
