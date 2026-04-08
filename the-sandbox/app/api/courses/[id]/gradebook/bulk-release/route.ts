/**
 * POST /api/courses/[id]/gradebook/bulk-release
 *
 * Bulk-releases all AI_DRAFT and PENDING_REVIEW entries for a course
 * (or a single assignment if assignmentId is provided).
 * Copies aiScore → facultyScore and aiRawFeedback → facultyFeedback.
 * Faculty only; must own the course.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  let assignmentId: string | undefined
  const parsed = await parseRequestBody(req)
  if (!('error' in parsed)) {
    assignmentId = (parsed.data as { assignmentId?: string }).assignmentId
  }

  // Find all matching entries
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      status: { in: ['PENDING_REVIEW', 'AI_DRAFT'] },
      submission: {
        assignment: {
          courseId,
          ...(assignmentId ? { id: assignmentId } : {}),
        },
      },
    },
    select: {
      id: true,
      aiScore: true,
      aiRawFeedback: true,
      aiCriteriaScores: true,
    },
  })

  if (entries.length === 0) {
    return NextResponse.json({ released: 0 })
  }

  // Batch update: copy AI scores → faculty scores and set status = RELEASED
  await prisma.$transaction(
    entries.map((e) =>
      prisma.gradebookEntry.update({
        where: { id: e.id },
        data: {
          status: 'RELEASED',
          facultyScore: e.aiScore,
          facultyFeedback: e.aiRawFeedback,
          facultyCriteriaScores: e.aiCriteriaScores ?? undefined,
          reviewedAt: new Date(),
          reviewedById: auth.user.id,
        },
      }),
    ),
  )

  return NextResponse.json({ released: entries.length })
})
