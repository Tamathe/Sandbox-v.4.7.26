import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const needsReview = searchParams.get('needsReview') === 'true'
  const studentId = searchParams.get('studentId')

  const where: Record<string, unknown> = {}
  if (needsReview) {
    where.humanReviewRequired = true
    where.staffReviewedAt = null
  }
  if (studentId) {
    where.studentId = studentId
  }

  const audits = await prisma.degreeAuditResult.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true, program: true, catalogYear: true } },
      program: { select: { id: true, code: true, name: true } },
    },
    orderBy: { auditedAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ audits }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
