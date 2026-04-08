import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getCommunicationsForUser, getUnreadCount } from '../../../lib/compliance-communication-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const [communications, unreadCount] = await Promise.all([
    getCommunicationsForUser(auth.user.id, auth.user.role),
    getUnreadCount(auth.user.id, auth.user.role),
  ])
  return NextResponse.json({ communications, unreadCount }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
