import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const courseId = req.nextUrl.searchParams.get('courseId')

  const where = courseId
    ? { userId: user.id, courseId }
    : { userId: user.id }

  const scores = await prisma.studentSuccessScore.findMany({
    where,
    orderBy: { score: 'asc' },
  })

  return NextResponse.json(scores, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
