import { prisma } from './prisma'
import { verifyChainIntegrity } from './compliance-audit-chain-service'

// ── Compliance Health Check Service ─────────────────────────────────────────
// Unified health check that external monitoring systems can poll.

type CheckStatus = 'pass' | 'warn' | 'fail'
type HealthCheck = { name: string; status: CheckStatus; message: string; value?: number }
type OverallStatus = 'healthy' | 'degraded' | 'critical'

export type HealthCheckResult = {
  status: OverallStatus
  timestamp: string
  checks: HealthCheck[]
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheck[] = []

  // 1. Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.push({ name: 'database-connectivity', status: 'pass', message: 'Database connection healthy' })
  } catch {
    checks.push({ name: 'database-connectivity', status: 'fail', message: 'Cannot reach database' })
  }

  // 2. Consent coverage — % users with active data consent
  try {
    const [total, withConsent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { dataConsentAt: { not: null } } }),
    ])
    const pct = total > 0 ? Math.round((withConsent / total) * 100) : 100
    const status: CheckStatus = pct >= 80 ? 'pass' : pct >= 60 ? 'warn' : 'fail'
    checks.push({
      name: 'consent-coverage',
      status,
      message: `${pct}% of users have active consent (${withConsent}/${total})`,
      value: pct,
    })
  } catch {
    checks.push({ name: 'consent-coverage', status: 'fail', message: 'Failed to query consent data' })
  }

  // 3. FERPA training — % educators/admins with FERPA acknowledgement
  try {
    const [totalEducators, withFerpa] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] } } }),
      prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] }, ferpaAckAt: { not: null } } }),
    ])
    const pct = totalEducators > 0 ? Math.round((withFerpa / totalEducators) * 100) : 100
    const status: CheckStatus = pct >= 90 ? 'pass' : pct >= 70 ? 'warn' : 'fail'
    checks.push({
      name: 'ferpa-training',
      status,
      message: `${pct}% of educators have FERPA ack (${withFerpa}/${totalEducators})`,
      value: pct,
    })
  } catch {
    checks.push({ name: 'ferpa-training', status: 'fail', message: 'Failed to query FERPA data' })
  }

  // 4. Incident backlog — count open FERPA incidents
  try {
    const openIncidents = await prisma.ferpaIncident.count({
      where: { status: { in: ['open', 'investigating'] } },
    })
    const status: CheckStatus = openIncidents === 0 ? 'pass' : openIncidents <= 3 ? 'warn' : 'fail'
    checks.push({
      name: 'incident-backlog',
      status,
      message: openIncidents === 0 ? 'No open incidents' : `${openIncidents} open incident(s)`,
      value: openIncidents,
    })
  } catch {
    checks.push({ name: 'incident-backlog', status: 'fail', message: 'Failed to query incidents' })
  }

  // 5. DPA expirations — DPAs expiring within 30 days
  try {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const expiringDPAs = await prisma.dataProcessingAgreement.count({
      where: {
        active: true,
        expiresAt: { lte: thirtyDaysFromNow },
      },
    })
    const status: CheckStatus = expiringDPAs === 0 ? 'pass' : expiringDPAs <= 2 ? 'warn' : 'fail'
    checks.push({
      name: 'dpa-expirations',
      status,
      message: expiringDPAs === 0 ? 'No DPAs expiring soon' : `${expiringDPAs} DPA(s) expiring within 30 days`,
      value: expiringDPAs,
    })
  } catch {
    checks.push({ name: 'dpa-expirations', status: 'fail', message: 'Failed to query DPA data' })
  }

  // 6. Audit chain integrity
  try {
    const chainResult = await verifyChainIntegrity()
    if (chainResult.valid) {
      checks.push({
        name: 'audit-chain-integrity',
        status: 'pass',
        message: `Chain valid (${chainResult.totalRecords} records)`,
        value: chainResult.totalRecords,
      })
    } else {
      checks.push({
        name: 'audit-chain-integrity',
        status: 'fail',
        message: `Chain broken at sequence ${chainResult.brokenAt}`,
        value: chainResult.brokenAt,
      })
    }
  } catch {
    checks.push({ name: 'audit-chain-integrity', status: 'fail', message: 'Failed to verify chain' })
  }

  // 7. Cron freshness — check if compliance-notifications cron ran in last 48h
  try {
    const fortyEightHoursAgo = new Date()
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48)
    const recentNotification = await prisma.complianceNotification.findFirst({
      where: { createdAt: { gte: fortyEightHoursAgo } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (recentNotification) {
      checks.push({
        name: 'cron-freshness',
        status: 'pass',
        message: `Last cron activity: ${recentNotification.createdAt.toISOString()}`,
      })
    } else {
      // Check if there are any notifications at all — if none, it may just be a fresh install
      const anyNotification = await prisma.complianceNotification.count()
      if (anyNotification === 0) {
        checks.push({
          name: 'cron-freshness',
          status: 'warn',
          message: 'No compliance notifications found — cron may not have run yet',
        })
      } else {
        checks.push({
          name: 'cron-freshness',
          status: 'warn',
          message: 'No compliance notifications in last 48 hours',
        })
      }
    }
  } catch {
    checks.push({ name: 'cron-freshness', status: 'fail', message: 'Failed to query cron data' })
  }

  // Overall status: critical if any fail, degraded if any warn, healthy if all pass
  const hasFail = checks.some((c) => c.status === 'fail')
  const hasWarn = checks.some((c) => c.status === 'warn')
  const status: OverallStatus = hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy'

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
  }
}
