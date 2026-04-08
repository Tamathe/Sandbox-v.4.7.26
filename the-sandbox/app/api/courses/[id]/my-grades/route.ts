import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

// GET /api/courses/[id]/my-grades
// Student only — returns all their GradebookEntries for this course.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: {
        studentId: user.id,
        assignment: { courseId: id },
      },
    },
    select: {
      id: true,
      status: true,
      aiScore: true,
      facultyScore: true,
      facultyFeedback: true,
      aiRawFeedback: true,
      canvasPushedAt: true,
      canvasPushStatus: true,
      submission: {
        select: {
          id: true,
          type: true,
          submittedAt: true,
          assignment: {
            select: {
              id: true,
              title: true,
              description: true,
              pointsPossible: true,
              dueAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(entries, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
