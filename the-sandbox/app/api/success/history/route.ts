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
  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  const history = await prisma.successScoreHistory.findMany({
    where: {
      userId: user.id,
      courseId,
      computedAt: { gte: new Date(Date.now() - days * 86400000) },
    },
    orderBy: { computedAt: 'asc' },
  })

  return NextResponse.json(history, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
