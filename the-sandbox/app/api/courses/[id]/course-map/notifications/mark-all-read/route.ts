import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { markAllAsRead } from '../../../../../../lib/course-map/notification-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

/**
 * POST /api/courses/[id]/course-map/notifications/mark-all-read
 * Mark all notifications as read for the current user.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const marked = await markAllAsRead(courseId, auth.user.id)

  return NextResponse.json({ ok: true, marked })
})
