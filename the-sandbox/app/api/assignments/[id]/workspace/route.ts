import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { suggestWorkflow, formatRubricForContext } from '../../../../lib/assignment-workspace-service'
import { formatDistanceToNow, isPast } from 'date-fns'

export const runtime = 'nodejs'

// GET /api/assignments/[id]/workspace
// Returns all data needed to render the assignment workspace.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id } = await params

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, courseCode: true, title: true } },
      rubric: {
        include: {
          criteria: {
            include: { bands: { orderBy: { minPoints: 'desc' } } },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!assignment.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify student is enrolled in the course
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { studentId: user.id, courseId: assignment.courseId },
  })
  if (!enrollment && user.role === 'STUDENT') {
    return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })
  }

  // Get student's submission if any
  const submission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: id, studentId: user.id } },
    select: {
      id: true,
      sessionId: true,
      textContent: true,
      submittedAt: true,
      gradebookEntry: {
        select: { status: true, facultyScore: true, facultyFeedback: true },
      },
    },
  })

  // Get related weak concepts for Sandy context
  const weakConcepts = await prisma.conceptState.findMany({
    where: {
      userId: user.id,
      courseId: assignment.courseId,
      bloomHighWater: { lt: 3 },
    },
    select: { conceptSlug: true, bloomHighWater: true },
    take: 5,
  })

  // Build due label
  let dueLabel = 'No due date'
  let urgency: 'critical' | 'warning' | 'info' = 'info'
  if (assignment.dueAt) {
    const due = new Date(assignment.dueAt)
    const hoursUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60)
    if (isPast(due)) {
      dueLabel = 'Past due'
      urgency = 'critical'
    } else {
      dueLabel = `Due ${formatDistanceToNow(due, { addSuffix: true })}`
      if (hoursUntilDue < 24) urgency = 'critical'
      else if (hoursUntilDue < 72) urgency = 'warning'
    }
  }

  // Suggest workflow
  const workflow = suggestWorkflow(assignment.description, assignment.type, assignment.assessmentMode)

  // Format rubric for Sandy context
  const rubricText = assignment.rubric
    ? formatRubricForContext(
        assignment.rubric.criteria.map((c) => ({
          title: c.title,
          maxPoints: c.maxPoints,
          description: c.description,
          bands: c.bands.map((b) => ({ label: b.label, description: b.description })),
        })),
        assignment.pointsPossible
      )
    : null

  // Determine submission status
  let submissionStatus: 'not-started' | 'draft' | 'submitted' | 'graded' = 'not-started'
  if (submission) {
    if (submission.gradebookEntry?.status === 'RELEASED') {
      submissionStatus = 'graded'
    } else {
      submissionStatus = 'submitted'
    }
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      courseId: assignment.courseId,
      courseCode: assignment.course.courseCode,
      courseName: assignment.course.title,
      description: assignment.description,
      type: assignment.type,
      assessmentMode: assignment.assessmentMode,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      dueLabel,
      urgency,
      pointsPossible: assignment.pointsPossible,
      acceptingLate: assignment.acceptingLate,
      rubric: assignment.rubric
        ? {
            id: assignment.rubric.id,
            title: assignment.rubric.title,
            criteria: assignment.rubric.criteria.map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              maxPoints: c.maxPoints,
              bands: c.bands.map((b) => ({
                label: b.label,
                minPoints: b.minPoints,
                maxPoints: b.maxPoints,
                description: b.description,
              })),
            })),
          }
        : null,
    },
    submission: submission
      ? {
          status: submissionStatus,
          sessionId: submission.sessionId,
          submittedAt: submission.submittedAt.toISOString(),
          grade: submission.gradebookEntry?.facultyScore?.toString() ?? null,
          feedback: submission.gradebookEntry?.facultyFeedback ?? null,
        }
      : { status: submissionStatus, sessionId: null, submittedAt: null, grade: null, feedback: null },
    relatedConcepts: weakConcepts.map((c) => c.conceptSlug.replace(/-/g, ' ')),
    workflow,
    rubricText,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
