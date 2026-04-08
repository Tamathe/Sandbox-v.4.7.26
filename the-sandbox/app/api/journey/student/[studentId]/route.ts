import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getStudentJourney } from '../../../../lib/journey/journey-service'
import { prisma } from '../../../../lib/prisma'

async function verifyAdvisorAccess(requesterId: string, studentId: string): Promise<boolean> {
  // Check if requester is faculty advisor for this student
  const adviseeLink = await prisma.facultyAdvisee.findFirst({
    where: { facultyId: requesterId, studentId },
  })
  if (adviseeLink) return true

  // Check if requester teaches a course the student is enrolled in
  const sharedCourse = await prisma.courseEnrollment.findFirst({
    where: {
      studentId,
      course: { instructorId: requesterId },
    },
  })
  return !!sharedCourse
}

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ studentId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { studentId } = await context.params

  const hasAccess = await verifyAdvisorAccess(auth.user.id, studentId)
  if (!hasAccess && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized to view this student journey' }, { status: 403 })
  }

  const weeks = parseInt(req.nextUrl.searchParams.get('weeks') || '16')
  const layer = req.nextUrl.searchParams.get('layer') || undefined

  const journey = await getStudentJourney(studentId, { weeks, layer })
  return NextResponse.json(journey, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
