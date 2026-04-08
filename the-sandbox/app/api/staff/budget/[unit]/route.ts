import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getBudgetDetail } from '../../../../lib/staff/budget-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ unit: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { unit } = await params
  const unitName = decodeURIComponent(unit)

  const snapshot = await getBudgetDetail(auth.user.id, unitName)

  if (!snapshot) {
    return NextResponse.json({ error: 'Budget unit not found' }, { status: 404 })
  }

  return NextResponse.json({ snapshot }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
