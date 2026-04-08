import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { getActiveCycle } from '../../../../lib/accreditation/dashboard-service'

export const GET = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ standardId: string }> }) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { standardId } = await context.params

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const narrative = await prisma.complianceNarrative.findFirst({
    where: { standardId, cycleId: cycle.id },
    orderBy: { version: 'desc' },
    include: { standard: { select: { standardNumber: true, standardTitle: true } } },
  })

  return NextResponse.json({ narrative }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
