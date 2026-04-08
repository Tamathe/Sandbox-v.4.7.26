import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { generateComplianceNotifications } from '../../../lib/compliance-notification-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  try {
    const count = await generateComplianceNotifications()
    return NextResponse.json({ ok: true, notificationsCreated: count }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('[CRON] compliance-notifications error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
})
