import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { courseId } = await params
  const ALLOWED_SORT_FIELDS = new Set(['score', 'name', 'attendance', 'engagement', 'updatedAt'])
  const rawSortBy = req.nextUrl.searchParams.get('sortBy') ?? 'score'
  const sortBy = ALLOWED_SORT_FIELDS.has(rawSortBy) ? rawSortBy : 'score'
  const order = req.nextUrl.searchParams.get('order') === 'desc' ? 'desc' : 'asc'

  const students = await prisma.studentSuccessScore.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: sortBy === 'name'
      ? { user: { name: order } }
      : { [sortBy]: order },
  })

  return NextResponse.json(students, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
