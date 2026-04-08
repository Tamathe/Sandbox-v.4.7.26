import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { harvestAllEvidence } from '../../../lib/accreditation/evidence-harvester'
import { analyzeAllGaps } from '../../../lib/accreditation/gap-detector'
import { rescoreAllEvidence } from '../../../lib/accreditation/quality-scorer'
import { getActiveCycle } from '../../../lib/accreditation/dashboard-service'

export const runtime = 'nodejs'
export const maxDuration = 120

export const POST = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle' }, { status: 404 })
  }

  console.log('[cron/accreditation-harvest] Starting evidence harvest...')

  // Step 1: Harvest evidence
  const harvestResults = await harvestAllEvidence(cycle.id)
  const totalHarvested = harvestResults.reduce((sum, r) => sum + r.harvested, 0)
  const totalErrors = harvestResults.reduce((sum, r) => sum + r.errors.length, 0)

  // Step 2: Re-score quality
  const { rescored } = await rescoreAllEvidence(cycle.id)

  // Step 3: Run gap analysis
  const gapResults = await analyzeAllGaps(cycle.id)
  const totalGaps = gapResults.reduce((sum, r) => sum + r.gaps.length, 0)

  console.log(`[cron/accreditation-harvest] Done: ${totalHarvested} harvested, ${rescored} rescored, ${totalGaps} gaps detected, ${totalErrors} errors`)

  return NextResponse.json({
    ok: true,
    harvested: totalHarvested,
    rescored,
    gapsDetected: totalGaps,
    errors: totalErrors,
  })
})
