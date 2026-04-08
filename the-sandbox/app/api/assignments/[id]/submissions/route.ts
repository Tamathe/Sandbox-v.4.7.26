import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

// GET /api/assignments/[id]/submissions
// Returns up to 10 most recent submissions with student name, email, submittedAt,
// and gradebookEntry.status. Educator/admin only.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: { course: { select: { instructorId: true } } },
  })
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === assignment.course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: id },
    orderBy: { submittedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      submittedAt: true,
      student: { select: { name: true, email: true } },
      gradebookEntry: { select: { status: true } },
    },
  })

  return NextResponse.json(submissions, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
