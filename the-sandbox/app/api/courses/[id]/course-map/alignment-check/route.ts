import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { checkCourseAlignment } from '../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const result = await checkCourseAlignment(courseId)
  return NextResponse.json(result)
})
