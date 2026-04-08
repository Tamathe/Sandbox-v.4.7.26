import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import {
  getUserNotifications,
  markAllNotificationsRead,
  findUserNotification,
  markNotificationRead,
} from '../../lib/notifications-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20),
  )

  const [notifications, unreadCount] = await getUserNotifications(auth.user.id, limit)

  return NextResponse.json({ notifications, unreadCount })
})

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = (await request.json().catch(() => ({}))) as {
    id?: string
    markAll?: boolean
  }

  if (body.markAll) {
    await markAllNotificationsRead(auth.user.id)

    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 })
  }

  const notification = await findUserNotification(auth.user.id, body.id)

  if (!notification) {
    return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
  }

  const updated = await markNotificationRead(body.id)

  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
