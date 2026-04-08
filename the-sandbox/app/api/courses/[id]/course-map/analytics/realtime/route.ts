/**
 * GET /api/courses/[id]/course-map/analytics/realtime
 *
 * Returns live engagement metrics: edit counts, active users,
 * node heatmap, time-series activity. Supports ?range=24h|7d|30d.
 *
 * Auth: requireCourseOwner
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../../lib/server-auth'
import { getCourseMapRealtimeAnalytics } from '../../../../../../lib/course-map/analytics-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const rangeParam = url.searchParams.get('range') || '24h'
  const range = ['24h', '7d', '30d'].includes(rangeParam)
    ? (rangeParam as '24h' | '7d' | '30d')
    : '24h'

  const analytics = await getCourseMapRealtimeAnalytics(courseId, range)

  return NextResponse.json(analytics, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
