import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { buildCourseInsights } from '../../../../lib/course-insights-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const insights = await buildCourseInsights(courseId)

  return NextResponse.json({ insights }, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
})
