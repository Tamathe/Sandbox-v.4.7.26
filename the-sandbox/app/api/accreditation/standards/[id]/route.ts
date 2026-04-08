import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { getStandardCompliance, getActiveCycle } from '../../../../lib/accreditation/dashboard-service'

export const GET = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const detail = await getStandardCompliance(id, cycle.id)
  return NextResponse.json(detail, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
