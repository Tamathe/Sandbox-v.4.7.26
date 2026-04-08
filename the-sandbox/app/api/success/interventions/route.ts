import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  const interventions = await prisma.successIntervention.findMany({
    where: {
      alert: { courseId },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      initiator: { select: { id: true, name: true } },
      alert: { select: { severity: true, patternType: true, triggerReason: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(interventions, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
