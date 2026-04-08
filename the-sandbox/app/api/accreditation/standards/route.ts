import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { getActiveCycle } from '../../../lib/accreditation/dashboard-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const cycle = await getActiveCycle()

  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true },
    include: cycle ? {
      evidence: { where: { cycleId: cycle.id }, select: { id: true, quality: true, qualityScore: true } },
      gaps: { where: { cycleId: cycle.id, remediationStatus: { not: 'resolved' } }, select: { id: true, severity: true } },
      narratives: { where: { cycleId: cycle.id }, orderBy: { version: 'desc' }, take: 1, select: { status: true } },
    } : undefined,
    orderBy: [{ sectionNumber: 'asc' }, { standardNumber: 'asc' }],
  })

  return NextResponse.json({ standards, cycleId: cycle?.id ?? null }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
