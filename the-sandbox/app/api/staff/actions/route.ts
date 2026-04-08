import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getActionQueue } from '../../../lib/staff/action-queue-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  const priority = url.searchParams.get('priority')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')
  const includeSnoozed = url.searchParams.get('includeSnoozed') === 'true'

  const result = await getActionQueue(auth.user.id, {
    status: status ? status.split(',') : undefined,
    type: type ? type.split(',') : undefined,
    priority: priority ? priority.split(',') : undefined,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
    includeSnoozed,
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
