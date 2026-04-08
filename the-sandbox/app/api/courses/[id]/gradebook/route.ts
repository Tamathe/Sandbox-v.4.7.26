import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

// GET /api/courses/[id]/gradebook
// Faculty only — returns all GradebookEntries for the course.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty = user.role === 'ADMIN' || (user.role === 'EDUCATOR' && user.id === course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: {
        assignment: { courseId: id },
      },
    },
    select: {
      id: true,
      status: true,
      aiScore: true,
      facultyScore: true,
      createdAt: true,
      submission: {
        select: {
          id: true,
          type: true,
          submittedAt: true,
          student: { select: { id: true, name: true, email: true } },
          assignment: {
            select: { id: true, title: true, pointsPossible: true },
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
