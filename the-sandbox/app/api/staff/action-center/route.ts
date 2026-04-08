import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getUnifiedActions, getActionCounts } from '../../../lib/staff/action-center-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const { searchParams } = req.nextUrl
  const source = searchParams.get('source') || undefined
  const priority = searchParams.get('priority') || undefined
  const status = searchParams.get('status') || undefined

  const [actions, counts] = await Promise.all([
    getUnifiedActions(user.id, user.email, { source, priority, status }),
    getActionCounts(user.id, user.email),
  ])

  return NextResponse.json({ actions, counts }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
