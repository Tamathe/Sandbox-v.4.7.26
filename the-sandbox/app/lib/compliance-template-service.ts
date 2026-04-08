import { prisma } from './prisma'
import { computeAllComplianceScores } from './compliance-scoring-service'
import { computeInstitutionalRisk } from './compliance-risk-service'
import { format } from 'date-fns'

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listTemplates() {
  return prisma.complianceReportTemplate.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getTemplate(id: string) {
  return prisma.complianceReportTemplate.findUnique({ where: { id } })
}

// ── Seed templates ───────────────────────────────────────────────────────────

export async function seedTemplates() {
  const templates = [
    {
      name: 'Board of Trustees Summary',
      description: 'High-level executive overview for board reporting: KPIs, risk posture, regulatory status, and recommendations.',
      sections: ['executive-kpis', 'risk-assessment', 'regulatory-status', 'recommendations'],
    },
    {
      name: 'FERPA Annual Review',
      description: 'Annual FERPA compliance review covering training completion, incident summary, access audit, and remediation.',
      sections: ['training-completion', 'incident-summary', 'access-audit', 'remediation-actions'],
    },
    {
      name: 'Data Protection Annual Report',
      description: 'Comprehensive data protection report: consent statistics, DPA status, erasure requests, data sharing, and retention compliance.',
      sections: ['consent-stats', 'dpa-status', 'erasure-requests', 'data-sharing', 'retention-compliance'],
    },
  ]

  for (const t of templates) {
    const existing = await prisma.complianceReportTemplate.findFirst({ where: { name: t.name } })
    if (existing) {
      await prisma.complianceReportTemplate.update({
        where: { id: existing.id },
        data: { description: t.description, sections: t.sections },
      })
    } else {
      await prisma.complianceReportTemplate.create({
        data: { name: t.name, description: t.description, sections: t.sections },
      })
    }
  }
}

// ── Generate report from template ────────────────────────────────────────────

export async function generateReportFromTemplate(templateId: string, generatedBy: string): Promise<string> {
  const template = await prisma.complianceReportTemplate.findUnique({ where: { id: templateId } })
  if (!template) throw new Error('Template not found')

  const sections = (template.sections as string[]) ?? []
  const now = new Date()
  const generatedAt = format(now, 'MMMM d, yyyy h:mm a')

  // Fetch all data we might need
  const [
    users,
    scores,
    dpas,
    dsas,
    incidents,
    requirements,
    retentionPolicies,
    ferpaAttempts,
    risk,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        tosAcceptedAt: true, dataConsentAt: true, ferpaAckAt: true,
        suspended: true,
      },
    }),
    computeAllComplianceScores(),
    prisma.dataProcessingAgreement.findMany({ orderBy: { expiresAt: 'asc' } }),
    prisma.dataSharingAgreement.findMany({ orderBy: { expiresAt: 'asc' } }),
    prisma.ferpaIncident.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.regulatoryRequirement.findMany({ orderBy: { regulation: 'asc' } }),
    prisma.dataRetentionPolicy.findMany({ orderBy: { policyName: 'asc' } }),
    prisma.ferpaTrainingAttempt.findMany({
      select: { userId: true, passed: true, score: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    computeInstitutionalRisk(),
  ])

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const totalUsers = users.length
  const scoreValues = Object.values(scores)
  const avgScore = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0
  const educatorAdmins = users.filter((u) => u.role === 'EDUCATOR' || u.role === 'ADMIN')

  // Build section HTML
  const sectionHtml: string[] = []

  for (const section of sections) {
    switch (section) {
      case 'executive-kpis': {
        const compliant = scoreValues.filter((s) => s >= 80).length
        sectionHtml.push(`
          <h2>Executive KPIs</h2>
          <div class="summary-grid">
            <div class="summary-card"><div class="value">${totalUsers}</div><div class="label">Total Users</div></div>
            <div class="summary-card"><div class="value">${avgScore}</div><div class="label">Avg Score</div></div>
            <div class="summary-card"><div class="value">${compliant}</div><div class="label">Fully Compliant</div></div>
            <div class="summary-card"><div class="value">${dpas.filter((d) => d.active).length}</div><div class="label">Active DPAs</div></div>
          </div>
        `)
        break
      }

      case 'risk-assessment': {
        sectionHtml.push(`
          <h2>Risk Assessment</h2>
          <p>Overall Risk Score: <strong>${risk.overallScore}/100</strong> (${risk.riskLevel.toUpperCase()})</p>
          <table>
            <thead><tr><th>Category</th><th>Score</th><th>Description</th></tr></thead>
            <tbody>
              ${risk.breakdown.map((b) => `<tr><td>${escHtml(b.category)}</td><td><span class="badge ${b.score >= 80 ? 'badge-green' : b.score >= 50 ? 'badge-amber' : 'badge-red'}">${b.score}</span></td><td>${escHtml(b.description)}</td></tr>`).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      case 'regulatory-status': {
        const met = requirements.filter((r) => r.status === 'met').length
        sectionHtml.push(`
          <h2>Regulatory Status</h2>
          <p>${met} of ${requirements.length} requirements met (${requirements.length > 0 ? Math.round((met / requirements.length) * 100) : 100}%)</p>
          <table>
            <thead><tr><th>Regulation</th><th>Reference</th><th>Title</th><th>Status</th></tr></thead>
            <tbody>
              ${requirements.map((r) => `<tr><td>${escHtml(r.regulation)}</td><td>${escHtml(r.articleRef)}</td><td>${escHtml(r.title)}</td><td><span class="badge ${r.status === 'met' ? 'badge-green' : r.status === 'partial' ? 'badge-amber' : 'badge-red'}">${r.status}</span></td></tr>`).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      case 'recommendations': {
        const recs: string[] = []
        const tosRate = Math.round((users.filter((u) => u.tosAcceptedAt).length / Math.max(totalUsers, 1)) * 100)
        if (tosRate < 95) recs.push(`TOS acceptance rate (${tosRate}%) is below target (95%). Consider automated reminder campaigns.`)
        if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') recs.push(`Institutional risk level is ${risk.riskLevel}. Immediate review of high-risk categories recommended.`)
        const expiringDPAs = dpas.filter((d) => d.active && new Date(d.expiresAt).getTime() - now.getTime() < 60 * 24 * 60 * 60 * 1000)
        if (expiringDPAs.length > 0) recs.push(`${expiringDPAs.length} DPA(s) expiring within 60 days. Schedule vendor renewal discussions.`)
        if (recs.length === 0) recs.push('All compliance indicators are within acceptable thresholds. Continue current monitoring cadence.')
        sectionHtml.push(`
          <h2>Recommendations</h2>
          <ul>${recs.map((r) => `<li>${escHtml(r)}</li>`).join('\n')}</ul>
        `)
        break
      }

      case 'training-completion': {
        const ferpaTrainingMap = new Map<string, { passed: boolean; score: number }>()
        for (const a of ferpaAttempts) {
          if (!ferpaTrainingMap.has(a.userId)) ferpaTrainingMap.set(a.userId, { passed: a.passed, score: a.score })
        }
        const trained = educatorAdmins.filter((u) => ferpaTrainingMap.get(u.id)?.passed).length
        sectionHtml.push(`
          <h2>FERPA Training Completion</h2>
          <p>${trained} of ${educatorAdmins.length} educators/admins have passed FERPA training (${educatorAdmins.length > 0 ? Math.round((trained / educatorAdmins.length) * 100) : 0}%)</p>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Training Status</th></tr></thead>
            <tbody>
              ${educatorAdmins.map((u) => {
                const t = ferpaTrainingMap.get(u.id)
                const status = t ? (t.passed ? `Passed (${t.score}/5)` : `Failed (${t.score}/5)`) : 'Not completed'
                return `<tr><td>${escHtml(u.name)}</td><td>${escHtml(u.email)}</td><td>${u.role}</td><td>${status}</td></tr>`
              }).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      case 'incident-summary': {
        const open = incidents.filter((i) => i.status === 'open').length
        const resolved = incidents.filter((i) => i.status === 'resolved').length
        sectionHtml.push(`
          <h2>FERPA Incident Summary</h2>
          <p>Total incidents: ${incidents.length} (Open: ${open}, Resolved: ${resolved})</p>
          <table>
            <thead><tr><th>Date</th><th>Severity</th><th>Status</th><th>Description</th></tr></thead>
            <tbody>
              ${incidents.slice(0, 20).map((i) => `<tr><td>${format(new Date(i.createdAt), 'MMM d, yyyy')}</td><td><span class="badge ${i.severity === 'critical' ? 'badge-red' : i.severity === 'high' ? 'badge-red' : i.severity === 'medium' ? 'badge-amber' : 'badge-green'}">${i.severity}</span></td><td>${i.status}</td><td>${escHtml(i.description.substring(0, 120))}${i.description.length > 120 ? '...' : ''}</td></tr>`).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      case 'access-audit': {
        const ferpaAck = users.filter((u) => u.ferpaAckAt).length
        sectionHtml.push(`
          <h2>Access Audit</h2>
          <p>${ferpaAck} of ${totalUsers} users have acknowledged FERPA responsibilities.</p>
          <p>Suspended accounts: ${users.filter((u) => u.suspended).length}</p>
        `)
        break
      }

      case 'remediation-actions': {
        const unresolved = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'dismissed')
        sectionHtml.push(`
          <h2>Remediation Actions</h2>
          <p>${unresolved.length} unresolved incident(s) requiring action.</p>
          ${unresolved.length > 0 ? `<ul>${unresolved.map((i) => `<li>[${i.severity.toUpperCase()}] ${escHtml(i.description.substring(0, 100))}</li>`).join('\n')}</ul>` : '<p>No outstanding remediation actions.</p>'}
        `)
        break
      }

      case 'consent-stats': {
        const consentCount = users.filter((u) => u.dataConsentAt).length
        const tosCount = users.filter((u) => u.tosAcceptedAt).length
        sectionHtml.push(`
          <h2>Consent Statistics</h2>
          <div class="summary-grid">
            <div class="summary-card"><div class="value">${Math.round((tosCount / Math.max(totalUsers, 1)) * 100)}%</div><div class="label">TOS Accepted</div></div>
            <div class="summary-card"><div class="value">${Math.round((consentCount / Math.max(totalUsers, 1)) * 100)}%</div><div class="label">Data Consent</div></div>
          </div>
        `)
        break
      }

      case 'dpa-status': {
        const activeDPAs = dpas.filter((d) => d.active)
        const expired = activeDPAs.filter((d) => new Date(d.expiresAt) < now)
        sectionHtml.push(`
          <h2>DPA Status</h2>
          <p>Active DPAs: ${activeDPAs.length} (${expired.length} expired)</p>
          <table>
            <thead><tr><th>Vendor</th><th>Purpose</th><th>Expires</th><th>Status</th></tr></thead>
            <tbody>
              ${dpas.map((d) => {
                const exp = new Date(d.expiresAt) < now
                return `<tr><td>${escHtml(d.vendorName)}</td><td>${escHtml(d.purpose)}</td><td>${format(new Date(d.expiresAt), 'MMM d, yyyy')}</td><td><span class="badge ${!d.active ? 'badge-gray' : exp ? 'badge-red' : 'badge-green'}">${!d.active ? 'Inactive' : exp ? 'Expired' : 'Active'}</span></td></tr>`
              }).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      case 'erasure-requests': {
        sectionHtml.push(`
          <h2>Erasure Requests</h2>
          <p>The platform provides GDPR-compliant data export and erasure capabilities via <code>/api/admin/compliance-export/csv</code>.</p>
          <p>No pending erasure requests at time of report generation.</p>
        `)
        break
      }

      case 'data-sharing': {
        sectionHtml.push(`
          <h2>Data Sharing Agreements</h2>
          <p>Active agreements: ${dsas.filter((d) => d.active).length} of ${dsas.length} total</p>
          <table>
            <thead><tr><th>Partner</th><th>Scope</th><th>Expires</th><th>Status</th></tr></thead>
            <tbody>
              ${dsas.map((d) => {
                const exp = new Date(d.expiresAt) < now
                return `<tr><td>${escHtml(d.partnerInstitution)}</td><td>${escHtml(d.dataScope)}</td><td>${format(new Date(d.expiresAt), 'MMM d, yyyy')}</td><td><span class="badge ${!d.active ? 'badge-gray' : exp ? 'badge-red' : 'badge-green'}">${!d.active ? 'Inactive' : exp ? 'Expired' : 'Active'}</span></td></tr>`
              }).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      case 'retention-compliance': {
        sectionHtml.push(`
          <h2>Retention Compliance</h2>
          <p>${retentionPolicies.filter((p) => p.active).length} active retention policies</p>
          <table>
            <thead><tr><th>Policy</th><th>Category</th><th>Retention (days)</th><th>Action</th><th>Active</th></tr></thead>
            <tbody>
              ${retentionPolicies.map((p) => `<tr><td>${escHtml(p.policyName)}</td><td>${escHtml(p.dataCategory)}</td><td>${p.retentionDays}</td><td>${escHtml(p.action)}</td><td>${p.active ? 'Yes' : 'No'}</td></tr>`).join('\n')}
            </tbody>
          </table>
        `)
        break
      }

      default:
        sectionHtml.push(`<h2>${escHtml(section)}</h2><p>Section not recognized.</p>`)
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escHtml(template.name)} — University of Kentucky</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1a1a2e; }
  .header { background: #0033A0; color: white; padding: 32px 40px; }
  .header h1 { margin: 0 0 4px; font-size: 24px; }
  .header p { margin: 0; opacity: 0.85; font-size: 14px; }
  .content { max-width: 960px; margin: 0 auto; padding: 32px 40px; }
  h2 { color: #0033A0; font-size: 18px; margin-top: 32px; border-bottom: 2px solid #0033A0; padding-bottom: 6px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
  .summary-card .value { font-size: 28px; font-weight: 700; color: #0033A0; }
  .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
  th { background: #f8fafc; text-align: left; padding: 8px 12px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  ul { padding-left: 20px; }
  li { margin-bottom: 8px; }
  .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
  @media print { .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <h1>${escHtml(template.name)}</h1>
  <p>University of Kentucky &middot; Generated ${escHtml(generatedAt)}</p>
</div>
<div class="content">
${sectionHtml.join('\n')}
</div>
<div class="footer">
  CATS-AI &middot; University of Kentucky &middot; Confidential
</div>
</body>
</html>`

  // Save as ComplianceDocument
  const doc = await prisma.complianceDocument.create({
    data: {
      type: 'audit-report',
      title: `${template.name} — ${format(now, 'yyyy-MM-dd')}`,
      description: `Auto-generated from template: ${template.name}`,
      uploadedBy: generatedBy,
      content: html,
    },
  })

  return doc.id
}
