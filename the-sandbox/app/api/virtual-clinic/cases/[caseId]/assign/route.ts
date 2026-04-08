import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'

interface AssignBody {
  courseId: string
  dueDate?: string
  title?: string
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  const { caseId } = await params

  const parsed = await parseRequestBody<AssignBody>(req)
  if ('error' in parsed) return parsed.error

  const { courseId, dueDate, title } = parsed.data
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Verify case exists and is published
  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: caseId },
    select: { id: true, title: true, creatorId: true, published: true },
  })

  if (!clinicalCase) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }
  if (!clinicalCase.published) {
    return NextResponse.json({ error: 'Only published cases can be assigned' }, { status: 400 })
  }

  // Only case creator or ADMIN can assign
  if (clinicalCase.creatorId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only the case creator or an admin can assign this case' }, { status: 403 })
  }

  // Verify the course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Check if assignment already exists for this case + course
  const existing = await prisma.assignment.findFirst({
    where: { clinicalCaseId: caseId, courseId, type: 'VIRTUAL_CLINIC' },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'This case is already assigned to this course' }, { status: 409 })
  }

  const assignment = await prisma.assignment.create({
    data: {
      courseId,
      title: title ?? `Virtual Clinic: ${clinicalCase.title}`,
      description: `Complete the clinical encounter for "${clinicalCase.title}"`,
      type: 'VIRTUAL_CLINIC',
      clinicalCaseId: caseId,
      dueAt: dueDate ? new Date(dueDate) : null,
      pointsPossible: 100,
      isPublished: true,
    },
  })

  return NextResponse.json(assignment, { status: 201 })
})
