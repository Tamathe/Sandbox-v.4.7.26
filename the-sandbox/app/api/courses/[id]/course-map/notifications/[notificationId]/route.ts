import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { markAsRead } from '../../../../../../lib/course-map/notification-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

/**
 * PATCH /api/courses/[id]/course-map/notifications/[notificationId]
 * Mark a notification as read for the current user.
 */
export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; notificationId: string }> },
) => {
  const { id: courseId, notificationId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const success = await markAsRead(courseId, notificationId, auth.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
})
