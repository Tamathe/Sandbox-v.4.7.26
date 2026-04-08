/**
 * GET /api/courses/[id]/course-map/learning-path
 *
 * Returns a personalized learning path for the current student.
 * Ordered list of nodeIds based on prerequisite topology, progress, and due dates.
 *
 * Auth: requireRequestUser (students see their own path)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { computeLearningPath } from '../../../../../lib/syllabus-architect/learning-path'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params

  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  // Find the course map for this course
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })

  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  const result = await computeLearningPath(courseMap.id, user.id)

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
