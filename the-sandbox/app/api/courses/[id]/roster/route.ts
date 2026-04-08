import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: id },
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { student: { name: 'asc' } },
  })

  const students = enrollments.map(e => ({
    id: e.student.id,
    name: e.student.name,
    email: e.student.email,
  }))

  return NextResponse.json({ students }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
