import { NextResponse } from 'next/server'
import { runHealthCheck } from '../../lib/compliance-health-service'
import { withErrorHandling } from '../../lib/api-utils'

// Public endpoint — returns only status + timestamp, no details.
// Designed for external uptime monitors (e.g. Datadog, Pingdom).
export const GET = withErrorHandling(async () => {
    const result = await runHealthCheck()
    return NextResponse.json({
      status: result.status,
      timestamp: result.timestamp,
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
