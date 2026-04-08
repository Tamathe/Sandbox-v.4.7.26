import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { getNotificationPreference, setNotificationPreference } from '../../../../../lib/messages/notification-pref-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

// GET /api/messages/groups/[groupId]/notifications
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const result = await getNotificationPreference(user.id, groupId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// PUT /api/messages/groups/[groupId]/notifications
export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const parsed = await parseRequestBody<{ level?: string }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (!body.level || typeof body.level !== 'string') {
    return NextResponse.json({ error: 'level is required' }, { status: 400 })
  }

  const level = body.level as 'ALL' | 'MENTIONS' | 'NONE'
  const result = await setNotificationPreference(user.id, groupId, level)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
