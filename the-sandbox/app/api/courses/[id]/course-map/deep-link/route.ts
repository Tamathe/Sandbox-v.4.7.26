import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { generateWeekDeepLink } from '../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const weekNumber = Number(req.nextUrl.searchParams.get('weekNumber'))
  if (!weekNumber || isNaN(weekNumber)) {
    return NextResponse.json({ error: 'weekNumber is required' }, { status: 400 })
  }

  const url = generateWeekDeepLink(courseId, weekNumber)
  return NextResponse.json({ url }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
