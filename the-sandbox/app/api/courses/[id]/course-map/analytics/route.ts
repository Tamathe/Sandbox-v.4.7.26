/**
 * GET /api/courses/[id]/course-map/analytics
 *
 * Returns editing pattern analytics, collaboration stats, node change
 * frequency, and time-based activity data.
 *
 * Auth: requireCourseOwner
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { getCourseMapAnalytics } from '../../../../../lib/syllabus-architect/analytics-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const analytics = await getCourseMapAnalytics(courseId)

  return NextResponse.json(analytics, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
