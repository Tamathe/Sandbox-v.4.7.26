import { prisma } from './prisma'
import { createHmac } from 'crypto'
import { computeAllComplianceScores } from './compliance-scoring-service'

// ── CEF Event Generation ────────────────────────────────────────────────────

export async function generateCEFEvents(): Promise<string> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)

  const logs = await prisma.complianceAuditLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const severityMap: Record<string, number> = {
    'accept-tos': 3,
    'accept-consent': 3,
    'accept-ferpa': 5,
    'bulk-tos-reset': 7,
    'user-data-erasure': 8,
    'revoke-consent': 5,
    'update-consent-category': 3,
  }

  const lines: string[] = []
  for (const log of logs) {
    const severity = severityMap[log.action] ?? 3
    const ext = [
      `src=${log.ipAddress ?? 'unknown'}`,
      `duser=${log.user.email}`,
      `rt=${log.createdAt.toISOString()}`,
      log.userAgent ? `requestClientApplication=${log.userAgent.slice(0, 100)}` : '',
    ]
      .filter(Boolean)
      .join(' ')

    lines.push(
      `CEF:0|UKY-Sandbox|Compliance|1.0|${log.action}|${log.action}|${severity}|${ext}`,
    )
  }

  return lines.join('\n')
}

// ── Full CSV Export ─────────────────────────────────────────────────────────

export async function generateFullCSV(): Promise<string> {
  const users = await prisma.user.findMany({
    where: { suspended: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      tosAcceptedAt: true,
      dataConsentAt: true,
      ferpaAckAt: true,
    },
    orderBy: { email: 'asc' },
  })

  const scores = await computeAllComplianceScores()

  const ferpaAttempts = await prisma.ferpaTrainingAttempt.findMany({
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
    select: { userId: true, passed: true, score: true, createdAt: true },
  })
  const attemptMap = new Map(ferpaAttempts.map((a) => [a.userId, a]))

  const header = [
    'Email',
    'Name',
    'Role',
    'Department',
    'Compliance Score',
    'TOS Accepted',
    'Data Consent',
    'FERPA Acknowledged',
    'FERPA Training Passed',
    'FERPA Training Score',
    'Last FERPA Attempt',
  ].join(',')

  const rows = users.map((u) => {
    const attempt = attemptMap.get(u.id)
    return [
      csvEscape(u.email),
      csvEscape(u.name),
      u.role,
      csvEscape(u.department ?? ''),
      scores[u.id] ?? 0,
      u.tosAcceptedAt?.toISOString() ?? '',
      u.dataConsentAt?.toISOString() ?? '',
      u.ferpaAckAt?.toISOString() ?? '',
      attempt ? (attempt.passed ? 'Yes' : 'No') : '',
      attempt?.score ?? '',
      attempt?.createdAt?.toISOString() ?? '',
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

// ── Webhook dispatch ────────────────────────────────────────────────────────

export async function dispatchWebhook(eventType: string, payload: Record<string, unknown>) {
  const webhooks = await prisma.complianceWebhook.findMany({
    where: { active: true },
  })

  for (const webhook of webhooks) {
    if (!webhook.events.includes(eventType)) continue

    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    })

    const signature = createHmac('sha256', webhook.secret).update(body).digest('hex')

    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Signature': `sha256=${signature}`,
          'X-Sandbox-Event': eventType,
        },
        body,
      })
    } catch (err) {
      console.error(`[WEBHOOK] Failed to deliver to ${webhook.url}:`, err)
    }
  }
}

// ── Webhook CRUD ────────────────────────────────────────────────────────────

export async function listWebhooks() {
  return prisma.complianceWebhook.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createWebhook(data: {
  url: string
  secret: string
  events: string[]
  active?: boolean
}) {
  return prisma.complianceWebhook.create({
    data: {
      url: data.url,
      secret: data.secret,
      events: data.events,
      active: data.active ?? true,
    },
  })
}

export async function deleteWebhook(id: string) {
  return prisma.complianceWebhook.delete({ where: { id } })
}
