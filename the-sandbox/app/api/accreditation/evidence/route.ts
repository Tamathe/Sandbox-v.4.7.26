import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { getActiveCycle } from '../../../lib/accreditation/dashboard-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = request.nextUrl
  const standardId = searchParams.get('standardId')
  const evidenceType = searchParams.get('type')
  const quality = searchParams.get('quality')

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const where: Record<string, unknown> = { cycleId: cycle.id }
  if (standardId) where.standardId = standardId
  if (evidenceType) where.evidenceType = evidenceType
  if (quality) where.quality = quality

  const evidence = await prisma.accreditationEvidence.findMany({
    where,
    include: { standard: { select: { standardNumber: true, standardTitle: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ evidence }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
