import { prisma } from './prisma'

type IntegrationStatus = 'active' | 'degraded' | 'inactive'
type IntegrationType = 'webhook' | 'cron' | 'export' | 'external'

export type IntegrationInfo = {
  name: string
  type: IntegrationType
  status: IntegrationStatus
  lastActivity: Date | null
  details: string
}

/**
 * Returns the status of all compliance integrations:
 * - Active ComplianceWebhooks
 * - Cron jobs (notifications, metric snapshots, workflow executions)
 * - SIEM export endpoint
 * - CSV export endpoint
 * - Health check endpoint
 */
export async function getIntegrationStatus(): Promise<IntegrationInfo[]> {
  const integrations: IntegrationInfo[] = []

  // 1. Webhooks — check each active ComplianceWebhook
  try {
    const webhooks = await prisma.complianceWebhook.findMany({
      select: { id: true, url: true, active: true, updatedAt: true },
    })
    if (webhooks.length === 0) {
      integrations.push({
        name: 'Compliance Webhooks',
        type: 'webhook',
        status: 'inactive',
        lastActivity: null,
        details: 'No webhooks configured',
      })
    } else {
      const activeCount = webhooks.filter((w) => w.active).length
      const latestUpdate = webhooks.reduce<Date | null>(
        (latest, w) => (!latest || w.updatedAt > latest ? w.updatedAt : latest),
        null,
      )
      integrations.push({
        name: `Compliance Webhooks (${activeCount}/${webhooks.length} active)`,
        type: 'webhook',
        status: activeCount > 0 ? 'active' : 'inactive',
        lastActivity: latestUpdate,
        details: `${activeCount} active, ${webhooks.length - activeCount} inactive`,
      })
    }
  } catch {
    integrations.push({
      name: 'Compliance Webhooks',
      type: 'webhook',
      status: 'inactive',
      lastActivity: null,
      details: 'Failed to query webhooks',
    })
  }

  // 2. Notification Cron — based on last ComplianceNotification created
  try {
    const lastNotification = await prisma.complianceNotification.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    const daysSinceLast = lastNotification
      ? (Date.now() - lastNotification.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity
    integrations.push({
      name: 'Notification Cron',
      type: 'cron',
      status: daysSinceLast < 2 ? 'active' : daysSinceLast < 7 ? 'degraded' : 'inactive',
      lastActivity: lastNotification?.createdAt ?? null,
      details: lastNotification
        ? `Last notification ${Math.round(daysSinceLast)}d ago`
        : 'No notifications recorded',
    })
  } catch {
    integrations.push({
      name: 'Notification Cron',
      type: 'cron',
      status: 'inactive',
      lastActivity: null,
      details: 'Failed to query notifications',
    })
  }

  // 3. Metric Snapshot Cron — based on last ComplianceMetricSnapshot
  try {
    const lastSnapshot = await prisma.complianceMetricSnapshot.findFirst({
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    })
    const daysSinceLast = lastSnapshot
      ? (Date.now() - lastSnapshot.capturedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity
    integrations.push({
      name: 'Metric Snapshot Cron',
      type: 'cron',
      status: daysSinceLast < 2 ? 'active' : daysSinceLast < 7 ? 'degraded' : 'inactive',
      lastActivity: lastSnapshot?.capturedAt ?? null,
      details: lastSnapshot
        ? `Last snapshot ${Math.round(daysSinceLast)}d ago`
        : 'No metric snapshots recorded',
    })
  } catch {
    integrations.push({
      name: 'Metric Snapshot Cron',
      type: 'cron',
      status: 'inactive',
      lastActivity: null,
      details: 'Failed to query metric snapshots',
    })
  }

  // 4. Workflow Execution Cron — based on recent ComplianceWorkflowExecution
  try {
    const lastExec = await prisma.complianceWorkflowExecution.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    const daysSinceLast = lastExec
      ? (Date.now() - lastExec.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity
    integrations.push({
      name: 'Workflow Execution Cron',
      type: 'cron',
      status: daysSinceLast < 2 ? 'active' : daysSinceLast < 7 ? 'degraded' : 'inactive',
      lastActivity: lastExec?.createdAt ?? null,
      details: lastExec
        ? `Last execution ${Math.round(daysSinceLast)}d ago`
        : 'No workflow executions recorded',
    })
  } catch {
    integrations.push({
      name: 'Workflow Execution Cron',
      type: 'cron',
      status: 'inactive',
      lastActivity: null,
      details: 'Failed to query workflow executions',
    })
  }

  // 5. SIEM Export — endpoint exists, always active
  integrations.push({
    name: 'SIEM Export',
    type: 'export',
    status: 'active',
    lastActivity: null,
    details: 'Export endpoint available at /api/admin/compliance-analytics',
  })

  // 6. CSV Export — endpoint exists, always active
  integrations.push({
    name: 'CSV Export',
    type: 'export',
    status: 'active',
    lastActivity: null,
    details: 'CSV export available via compliance report service',
  })

  // 7. Health Check — endpoint exists, always active
  integrations.push({
    name: 'Health Check Endpoint',
    type: 'external',
    status: 'active',
    lastActivity: new Date(),
    details: 'Available at /api/admin/compliance-health',
  })

  return integrations
}
