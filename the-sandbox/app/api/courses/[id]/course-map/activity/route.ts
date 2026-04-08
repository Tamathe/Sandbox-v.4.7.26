/**
 * GET /api/courses/[id]/course-map/activity
 *
 * Returns a paginated activity feed of CourseMapEdit records.
 * Query params: ?limit=30&cursor=<ISO timestamp>
 *
 * Auth: requireCourseOwner
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { getRecentMapActivity } from '../../../../../lib/syllabus-architect/notification-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || '30'), 100)
  const cursor = url.searchParams.get('cursor') || undefined

  const result = await getRecentMapActivity(courseId, limit, cursor)

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
