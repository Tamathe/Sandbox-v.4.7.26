import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { getCourseMap, suggestRebalance } from '../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const courseMap = await getCourseMap(courseId)
  if (!courseMap || courseMap.weeks.length === 0) {
    return NextResponse.json({ error: 'No course map found' }, { status: 404 })
  }

  const result = await suggestRebalance(courseId, courseMap.weeks)
  return NextResponse.json(result)
})
