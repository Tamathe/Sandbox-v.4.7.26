import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> },
) => {
  const { id: courseId, changeId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const change = await prisma.coursePolicyChange.findFirst({
    where: { id: changeId, courseId },
  })

  if (!change) {
    return NextResponse.json({ error: 'Change not found' }, { status: 404 })
  }

  return NextResponse.json({ change }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
