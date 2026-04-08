/**
 * POST /api/cron/effectiveness-rollup
 *
 * Nightly cron: recomputes ToolEffectivenessAggregate and ObjectiveProgressSnapshot
 * for all tool × course pairs that have new sessions in the last 25 hours.
 *
 * Auth: CRON_SECRET Bearer token (timing-safe comparison, fail-closed).
 * Vercel cron schedule: daily at 02:00 UTC.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { rollupAggregates } from '../../../lib/effectiveness-engine'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const start = Date.now()

  try {
    const { aggregatesComputed, snapshotsComputed } = await rollupAggregates()
    const durationMs = Date.now() - start

    return NextResponse.json({
      ok: true,
      aggregatesComputed,
      snapshotsComputed,
      durationMs,
    })
  } catch (err) {
    console.error('[cron/effectiveness-rollup] Fatal error:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
})
