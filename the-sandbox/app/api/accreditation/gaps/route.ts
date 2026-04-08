import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { getActiveCycle } from '../../../lib/accreditation/dashboard-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = request.nextUrl
  const severity = searchParams.get('severity')

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const where: Record<string, unknown> = {
    cycleId: cycle.id,
    remediationStatus: { not: 'resolved' },
  }
  if (severity && severity !== 'all') where.severity = severity

  const gaps = await prisma.complianceGap.findMany({
    where,
    include: { standard: { select: { standardNumber: true, standardTitle: true } } },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ gaps }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
