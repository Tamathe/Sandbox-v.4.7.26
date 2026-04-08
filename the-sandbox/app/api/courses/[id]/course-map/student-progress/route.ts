import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getStudentCourseMapProgress } from '../../../../../lib/course-map-service'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Verify enrollment
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { courseId, studentId: user.id },
    select: { id: true },
  })

  if (!enrollment && user.role !== 'ADMIN' && user.role !== 'EDUCATOR') {
    return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
  }

  const progress = await getStudentCourseMapProgress(courseId, user.id)
  return NextResponse.json({ progress }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
