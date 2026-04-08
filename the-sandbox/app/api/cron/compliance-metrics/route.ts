import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { captureMetricSnapshot } from '../../../lib/compliance-metrics-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const denied = verifyCronSecret(req)
  if (denied) return denied

  try {
    const snapshots = await captureMetricSnapshot()
    return NextResponse.json({ ok: true, captured: snapshots.length }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('[CRON] compliance metrics capture error:', error)
    return NextResponse.json({ error: 'Failed to capture metrics' }, { status: 500 })
  }
})
