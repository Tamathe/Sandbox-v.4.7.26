import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import { computeAllComplianceScores } from './compliance-scoring-service'

// ── Types ───────────────────────────────────────────────────────────────────

type Finding = {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  title: string
  description: string
  recommendation: string
}

type AuditFindings = {
  summary: string
  overallRisk: string
  findings: Finding[]
  statistics: {
    totalUsers: number
    avgComplianceScore: number
    compliantPercentage: number
    activeDPAs: number
    activeDSAs: number
    openIncidents: number
    ferpaTrainingCompletion: number
  }
}

// ── Generate Audit Report ───────────────────────────────────────────────────

export async function generateAuditReport(generatedById: string, scope: string = 'full-compliance-audit') {
  // Gather all compliance data
  const [
    users,
    scores,
    dpas,
    dsas,
    incidents,
    ferpaAttempts,
    retentionPolicies,
    consentVersions,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, role: true,
        tosAcceptedAt: true, dataConsentAt: true, ferpaAckAt: true,
        suspended: true,
      },
    }),
    computeAllComplianceScores(),
    prisma.dataProcessingAgreement.findMany(),
    prisma.dataSharingAgreement.findMany(),
    prisma.ferpaIncident.findMany(),
    prisma.ferpaTrainingAttempt.findMany({
      select: { userId: true, passed: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dataRetentionPolicy.findMany(),
    prisma.consentVersion.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  const scoreValues = Object.values(scores)
  const avgScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : 0
  const compliantCount = scoreValues.filter((s) => s >= 80).length
  const compliantPct = scoreValues.length > 0
    ? Math.round((compliantCount / scoreValues.length) * 100)
    : 0

  // FERPA training completion
  const educatorsAdmins = users.filter((u) => u.role === 'EDUCATOR' || u.role === 'ADMIN')
  const latestAttempts = new Map<string, boolean>()
  for (const a of ferpaAttempts) {
    if (!latestAttempts.has(a.userId)) latestAttempts.set(a.userId, a.passed)
  }
  const ferpaCompleted = educatorsAdmins.filter((u) => latestAttempts.get(u.id) === true).length
  const ferpaCompletionPct = educatorsAdmins.length > 0
    ? Math.round((ferpaCompleted / educatorsAdmins.length) * 100)
    : 100

  const now = new Date()
  const activeDPAs = dpas.filter((d) => d.active && new Date(d.expiresAt) > now)
  const activeDSAs = dsas.filter((d) => d.active && new Date(d.expiresAt) > now)
  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'investigating')
  const expiredDPAs = dpas.filter((d) => d.active && new Date(d.expiresAt) <= now)

  // Build the analysis prompt
  const analysisContext = `
COMPLIANCE DATA SUMMARY FOR AUDIT:

Users: ${users.length} total, ${users.filter((u) => u.suspended).length} suspended
Average Compliance Score: ${avgScore}/100
Compliant (≥80): ${compliantPct}%
TOS Accepted: ${users.filter((u) => u.tosAcceptedAt).length}/${users.length}
Data Consent: ${users.filter((u) => u.dataConsentAt).length}/${users.length}
FERPA Acknowledged: ${users.filter((u) => u.ferpaAckAt).length}/${users.length}
FERPA Training Completion (educators/admins): ${ferpaCompletionPct}%

Data Processing Agreements: ${dpas.length} total, ${activeDPAs.length} active, ${expiredDPAs.length} expired-but-active
Data Sharing Agreements: ${dsas.length} total, ${activeDSAs.length} active
Retention Policies: ${retentionPolicies.length} configured, ${retentionPolicies.filter((p) => p.active).length} active
Consent Versions: ${consentVersions.length} published

FERPA Incidents: ${incidents.length} total, ${openIncidents.length} open/investigating
${openIncidents.length > 0 ? `Open incidents by severity: ${JSON.stringify(openIncidents.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] ?? 0) + 1; return acc }, {} as Record<string, number>))}` : 'No open incidents.'}

Scope: ${scope}
`

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `You are an institutional compliance auditor for the University of Kentucky's AI education platform.

Analyze the following compliance data and generate a structured audit report. Focus on actionable findings.

${analysisContext}

Return ONLY valid JSON (no markdown wrapping) in this exact format:
{
  "summary": "2-3 sentence executive summary of the compliance posture",
  "overallRisk": "LOW or MEDIUM or HIGH or CRITICAL",
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "category name (e.g. FERPA, Data Protection, Training, Agreements, Retention)",
      "title": "short finding title",
      "description": "detailed description of the issue or observation",
      "recommendation": "specific action to resolve or improve"
    }
  ]
}

Generate 5-10 findings covering the most important compliance observations. Include positive findings (severity "info") where the platform is performing well.`,
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse audit report from AI response')
  }

  const aiFindings = JSON.parse(jsonMatch[0]) as { summary: string; overallRisk: string; findings: Finding[] }

  const findings: AuditFindings = {
    ...aiFindings,
    statistics: {
      totalUsers: users.length,
      avgComplianceScore: avgScore,
      compliantPercentage: compliantPct,
      activeDPAs: activeDPAs.length,
      activeDSAs: activeDSAs.length,
      openIncidents: openIncidents.length,
      ferpaTrainingCompletion: ferpaCompletionPct,
    },
  }

  // Persist the report
  const report = await prisma.auditReport.create({
    data: {
      generatedAt: now,
      scope,
      findings: toJsonValue(findings),
      generatedBy: generatedById,
    },
  })

  return report
}

// ── List Audit Reports ──────────────────────────────────────────────────────

export async function listAuditReports() {
  return prisma.auditReport.findMany({
    orderBy: { generatedAt: 'desc' },
    take: 50,
  })
}

// ── Get Single Audit Report ─────────────────────────────────────────────────

export async function getAuditReport(id: string) {
  return prisma.auditReport.findUnique({ where: { id } })
}
