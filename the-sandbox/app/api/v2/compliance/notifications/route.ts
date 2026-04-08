import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getComplianceNotifications } from '../../../../lib/compliance-notification-service'
import { formatResponse } from '../../../../lib/compliance-api-version'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const notifications = await getComplianceNotifications(user.id)

  // Group by type with per-type unread count
  const grouped: Record<string, { items: typeof notifications; unreadCount: number }> = {}
  let totalUnread = 0

  for (const n of notifications) {
    if (!grouped[n.type]) {
      grouped[n.type] = { items: [], unreadCount: 0 }
    }
    grouped[n.type].items.push(n)
    if (!n.read) {
      grouped[n.type].unreadCount++
      totalUnread++
    }
  }

  const response = formatResponse(
    {
      grouped,
      totalUnread,
      total: notifications.length,
    },
    '2',
    user.id,
  )
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  return response
})
