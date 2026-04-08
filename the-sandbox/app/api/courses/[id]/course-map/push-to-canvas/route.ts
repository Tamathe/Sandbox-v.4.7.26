import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { pushCourseMapToCanvas } from '../../../../../lib/course-map-service'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { canvasCourseId: true },
  })

  if (!course?.canvasCourseId) {
    return NextResponse.json(
      { error: 'This course is not linked to a Canvas course' },
      { status: 400 },
    )
  }

  const result = await pushCourseMapToCanvas(courseId, course.canvasCourseId)
  return NextResponse.json({ result })
})
