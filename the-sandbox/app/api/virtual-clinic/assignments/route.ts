import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  // Get user's enrolled courses
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: user.id },
    select: { courseId: true },
  })
  const courseIds = enrollments.map((e) => e.courseId)

  if (courseIds.length === 0) {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Find Virtual Clinic assignments in those courses
  const assignments = await prisma.assignment.findMany({
    where: {
      courseId: { in: courseIds },
      type: 'VIRTUAL_CLINIC',
      isPublished: true,
      clinicalCaseId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueAt: true,
      clinicalCaseId: true,
    },
  })

  const result = assignments.map((a) => ({
    assignmentId: a.id,
    caseId: a.clinicalCaseId!,
    title: a.title,
    dueAt: a.dueAt?.toISOString() ?? null,
  }))

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
