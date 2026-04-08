import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getComplianceDashboard, getActiveCycle } from '../../../lib/accreditation/dashboard-service'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle' }, { status: 404 })
  }

  console.log('[cron/accreditation-snapshot] Taking readiness snapshot...')

  const dashboard = await getComplianceDashboard(cycle.id)

  const narrativesApproved = dashboard.narrativeSummary.approved + dashboard.narrativeSummary.final

  await prisma.accreditationReadinessSnapshot.create({
    data: {
      cycleId: cycle.id,
      overallReadiness: dashboard.overallReadiness,
      standardsMet: dashboard.standardsSummary.met,
      standardsPartial: dashboard.standardsSummary.partial,
      standardsGapped: dashboard.standardsSummary.gapped,
      gapsBySeverity: dashboard.gapSummary,
      evidenceCount: dashboard.standardsSummary.met + dashboard.standardsSummary.partial,
      narrativesApproved,
    },
  })

  // Update cycle readiness
  await prisma.accreditationCycle.update({
    where: { id: cycle.id },
    data: {
      overallReadiness: dashboard.overallReadiness,
      standardsMet: dashboard.standardsSummary.met,
      gapCount: dashboard.gapSummary.critical + dashboard.gapSummary.major + dashboard.gapSummary.minor + dashboard.gapSummary.informational,
    },
  })

  console.log(`[cron/accreditation-snapshot] Snapshot saved: ${(dashboard.overallReadiness * 100).toFixed(0)}% readiness`)

  return NextResponse.json({ ok: true, readiness: dashboard.overallReadiness })
})
