import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getNotifications } from '../../../../../lib/course-map/notification-service'
import type { NotificationType } from '../../../../../lib/course-map/notification-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/notifications
 * List notifications with optional filters: ?type=&unreadOnly=&page=&limit=
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const type = url.searchParams.get('type') as NotificationType | null
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

  const result = await getNotifications(courseId, auth.user.id, {
    type: type || undefined,
    unreadOnly,
    page,
    limit,
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
