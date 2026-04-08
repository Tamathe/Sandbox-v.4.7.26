import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { pushGradeToCanvas } from '../../../../lib/canvas-client'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

// POST /api/gradebook/[entryId]/release
// Faculty only — approves the grade and releases it to the student.
// If Canvas credentials are configured, pushes the grade to Canvas.
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) => {
  const { entryId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const entry = await prisma.gradebookEntry.findUnique({
    where: { id: entryId },
    include: {
      submission: {
        include: {
          assignment: {
            include: {
              course: { select: { id: true, instructorId: true, canvasCourseId: true } },
            },
          },
          student: { select: { id: true, email: true } },
        },
      },
    },
  })
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === entry.submission.assignment.course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (entry.status === 'RELEASED') {
    return NextResponse.json({ error: 'Already released' }, { status: 409 })
  }

  const finalScore = entry.facultyScore ?? entry.aiScore
  if (finalScore == null) {
    return NextResponse.json({ error: 'No score set — set a score before releasing' }, { status: 400 })
  }

  // Mark as released
  const updated = await prisma.gradebookEntry.update({
    where: { id: entryId },
    data: {
      status: 'RELEASED',
      reviewedById: user.id,
      reviewedAt: new Date(),
      facultyScore: finalScore,
    },
  })

  // Attempt Canvas push if configured
  const { assignment } = entry.submission
  const canvasCourseId = assignment.course.canvasCourseId
  const canvasAssignmentId = assignment.canvasAssignmentId

  if (canvasCourseId && canvasAssignmentId) {
    const pushResult = await pushGradeToCanvas({
      canvasCourseId,
      canvasAssignmentId,
      studentEmail: entry.submission.student.email,
      score: finalScore,
      comment: entry.facultyFeedback ?? entry.aiRawFeedback ?? undefined,
    })
    await prisma.gradebookEntry.update({
      where: { id: entryId },
      data: {
        canvasPushedAt: new Date(),
        canvasPushStatus: pushResult.success ? 'success' : `error: ${pushResult.error}`,
      },
    })
    return NextResponse.json({ ...updated, canvasPush: pushResult })
  }

  return NextResponse.json(updated)
})
