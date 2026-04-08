import { prisma } from './prisma'

type ActivityEntry = {
  id: string
  type: 'audit' | 'notification' | 'incident' | 'workflow' | 'communication' | 'acceptance'
  title: string
  description: string
  actor: string
  timestamp: string
}

/**
 * Fetches recent compliance activity across multiple tables, merges by timestamp.
 */
export async function getRecentActivity(limit = 50): Promise<ActivityEntry[]> {
  const [auditLogs, notifications, incidents, workflows, communications, acceptances] =
    await Promise.all([
      prisma.complianceAuditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.complianceNotification.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.ferpaIncident.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { reportedBy: { select: { name: true } } },
      }),
      prisma.complianceWorkflowExecution.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.complianceCommunication.findMany({
        take: 10,
        orderBy: { sentAt: 'desc' },
        include: { sender: { select: { name: true } } },
      }),
      prisma.policyAcceptanceRecord.findMany({
        take: 10,
        orderBy: { acceptedAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
    ])

  const entries: ActivityEntry[] = []

  for (const log of auditLogs) {
    entries.push({
      id: log.id,
      type: 'audit',
      title: `Audit: ${log.action}`,
      description: log.action,
      actor: log.user.name,
      timestamp: log.createdAt.toISOString(),
    })
  }

  for (const n of notifications) {
    entries.push({
      id: n.id,
      type: 'notification',
      title: n.title,
      description: n.message,
      actor: n.user.name,
      timestamp: n.createdAt.toISOString(),
    })
  }

  for (const inc of incidents) {
    entries.push({
      id: inc.id,
      type: 'incident',
      title: `FERPA Incident — ${inc.severity}`,
      description: inc.description.slice(0, 200),
      actor: inc.reportedBy.name,
      timestamp: inc.createdAt.toISOString(),
    })
  }

  for (const wf of workflows) {
    entries.push({
      id: wf.id,
      type: 'workflow',
      title: `Workflow: ${wf.ruleName}`,
      description: `Action: ${wf.action} — ${wf.result}`,
      actor: wf.user.name,
      timestamp: wf.createdAt.toISOString(),
    })
  }

  for (const comm of communications) {
    entries.push({
      id: comm.id,
      type: 'communication',
      title: comm.subject,
      description: comm.body.slice(0, 200),
      actor: comm.sender.name,
      timestamp: comm.sentAt.toISOString(),
    })
  }

  for (const acc of acceptances) {
    entries.push({
      id: acc.id,
      type: 'acceptance',
      title: `Policy accepted: ${acc.policyType} v${acc.policyVersion}`,
      description: `${acc.user.name} accepted ${acc.policyType} policy`,
      actor: acc.user.name,
      timestamp: acc.acceptedAt.toISOString(),
    })
  }

  // Sort by timestamp desc and limit
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return entries.slice(0, limit)
}
