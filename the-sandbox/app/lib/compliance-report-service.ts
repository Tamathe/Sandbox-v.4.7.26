import { prisma } from './prisma'
import { computeAllComplianceScores } from './compliance-scoring-service'
import { format } from 'date-fns'

export async function generateComplianceReport(): Promise<string> {
  const [
    users,
    scores,
    dpas,
    dsas,
    retentionPolicies,
    consentVersions,
    ferpaAttempts,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tosAcceptedAt: true,
        dataConsentAt: true,
        ferpaAckAt: true,
        acceptedTosVersion: true,
        acceptedConsentVersion: true,
        acceptedFerpaVersion: true,
        suspended: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    }),
    computeAllComplianceScores(),
    prisma.dataProcessingAgreement.findMany({ orderBy: { expiresAt: 'asc' } }),
    prisma.dataSharingAgreement.findMany({ orderBy: { expiresAt: 'asc' } }),
    prisma.dataRetentionPolicy.findMany({ orderBy: { policyName: 'asc' } }),
    prisma.consentVersion.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.ferpaTrainingAttempt.findMany({
      select: { userId: true, passed: true, score: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const now = new Date()
  const generatedAt = format(now, 'MMMM d, yyyy h:mm a')

  // Summary stats
  const totalUsers = users.length
  const tosAccepted = users.filter((u) => u.tosAcceptedAt).length
  const consentAccepted = users.filter((u) => u.dataConsentAt).length
  const ferpaAcknowledged = users.filter((u) => u.ferpaAckAt).length
  const scoreValues = Object.values(scores)
  const avgScore = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0
  const compliant = scoreValues.filter((s) => s >= 80).length
  const activeDPAs = dpas.filter((d) => d.active).length
  const activeDSAs = dsas.filter((d) => d.active).length

  // Build FERPA training lookup (latest attempt per user)
  const ferpaTrainingMap = new Map<string, { passed: boolean; score: number; date: Date }>()
  for (const attempt of ferpaAttempts) {
    if (!ferpaTrainingMap.has(attempt.userId)) {
      ferpaTrainingMap.set(attempt.userId, { passed: attempt.passed, score: attempt.score, date: attempt.createdAt })
    }
  }

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Institutional Compliance Report — University of Kentucky</title>
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
  .check { color: #16a34a; }
  .cross { color: #dc2626; }
  .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
  @media print { .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <h1>Institutional Compliance Report</h1>
  <p>University of Kentucky &middot; Generated ${escHtml(generatedAt)}</p>
</div>
<div class="content">

<h2>Executive Summary</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="value">${totalUsers}</div><div class="label">Total Users</div></div>
  <div class="summary-card"><div class="value">${avgScore}</div><div class="label">Avg Compliance Score</div></div>
  <div class="summary-card"><div class="value">${compliant}</div><div class="label">Fully Compliant (≥80)</div></div>
  <div class="summary-card"><div class="value">${activeDPAs + activeDSAs}</div><div class="label">Active Agreements</div></div>
</div>
<div class="summary-grid">
  <div class="summary-card"><div class="value">${Math.round((tosAccepted / Math.max(totalUsers, 1)) * 100)}%</div><div class="label">TOS Acceptance</div></div>
  <div class="summary-card"><div class="value">${Math.round((consentAccepted / Math.max(totalUsers, 1)) * 100)}%</div><div class="label">Data Consent</div></div>
  <div class="summary-card"><div class="value">${Math.round((ferpaAcknowledged / Math.max(totalUsers, 1)) * 100)}%</div><div class="label">FERPA Acknowledged</div></div>
  <div class="summary-card"><div class="value">${retentionPolicies.filter((p) => p.active).length}</div><div class="label">Active Retention Policies</div></div>
</div>

<h2>User Compliance Status</h2>
<table>
<thead><tr>
  <th>Name</th><th>Email</th><th>Role</th><th>Score</th><th>TOS</th><th>Consent</th><th>FERPA</th><th>Training</th>
</tr></thead>
<tbody>
${users
  .map((u) => {
    const s = scores[u.id] ?? 0
    const scoreBadge = s >= 80 ? 'badge-green' : s >= 50 ? 'badge-amber' : 'badge-red'
    const training = ferpaTrainingMap.get(u.id)
    const trainingStr = training ? (training.passed ? `Passed (${training.score}/5)` : `Failed (${training.score}/5)`) : '—'
    return `<tr>
  <td>${escHtml(u.name)}</td>
  <td>${escHtml(u.email)}</td>
  <td><span class="badge badge-gray">${u.role}</span></td>
  <td><span class="badge ${scoreBadge}">${s}</span></td>
  <td class="${u.tosAcceptedAt ? 'check' : 'cross'}">${u.tosAcceptedAt ? '✓' : '✗'}</td>
  <td class="${u.dataConsentAt ? 'check' : 'cross'}">${u.dataConsentAt ? '✓' : '✗'}</td>
  <td class="${u.ferpaAckAt ? 'check' : 'cross'}">${u.ferpaAckAt ? '✓' : '✗'}</td>
  <td>${trainingStr}</td>
</tr>`
  })
  .join('\n')}
</tbody>
</table>

<h2>Data Processing Agreements (${dpas.length})</h2>
${
  dpas.length === 0
    ? '<p>No DPAs configured.</p>'
    : `<table>
<thead><tr><th>Vendor</th><th>Purpose</th><th>Categories</th><th>Signed</th><th>Expires</th><th>Status</th></tr></thead>
<tbody>
${dpas
  .map((d) => {
    const expired = new Date(d.expiresAt) < now
    const statusBadge = !d.active ? 'badge-gray' : expired ? 'badge-red' : 'badge-green'
    const statusLabel = !d.active ? 'Inactive' : expired ? 'Expired' : 'Active'
    return `<tr>
  <td>${escHtml(d.vendorName)}</td>
  <td>${escHtml(d.purpose)}</td>
  <td>${d.dataCategories.map(escHtml).join(', ')}</td>
  <td>${format(new Date(d.signedAt), 'MMM d, yyyy')}</td>
  <td>${format(new Date(d.expiresAt), 'MMM d, yyyy')}</td>
  <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
</tr>`
  })
  .join('\n')}
</tbody>
</table>`
}

<h2>Data Sharing Agreements (${dsas.length})</h2>
${
  dsas.length === 0
    ? '<p>No data sharing agreements configured.</p>'
    : `<table>
<thead><tr><th>Partner</th><th>Scope</th><th>Legal Basis</th><th>Signed</th><th>Expires</th><th>Status</th></tr></thead>
<tbody>
${dsas
  .map((d) => {
    const expired = new Date(d.expiresAt) < now
    const statusBadge = !d.active ? 'badge-gray' : expired ? 'badge-red' : 'badge-green'
    const statusLabel = !d.active ? 'Inactive' : expired ? 'Expired' : 'Active'
    return `<tr>
  <td>${escHtml(d.partnerInstitution)}</td>
  <td>${escHtml(d.dataScope)}</td>
  <td>${escHtml(d.legalBasis)}</td>
  <td>${format(new Date(d.signedAt), 'MMM d, yyyy')}</td>
  <td>${format(new Date(d.expiresAt), 'MMM d, yyyy')}</td>
  <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
</tr>`
  })
  .join('\n')}
</tbody>
</table>`
}

<h2>Data Retention Policies (${retentionPolicies.length})</h2>
${
  retentionPolicies.length === 0
    ? '<p>No retention policies configured.</p>'
    : `<table>
<thead><tr><th>Policy</th><th>Category</th><th>Retention (days)</th><th>Action</th><th>Active</th></tr></thead>
<tbody>
${retentionPolicies
  .map(
    (p) => `<tr>
  <td>${escHtml(p.policyName)}</td>
  <td>${escHtml(p.dataCategory)}</td>
  <td>${p.retentionDays}</td>
  <td>${escHtml(p.action)}</td>
  <td class="${p.active ? 'check' : 'cross'}">${p.active ? '✓' : '✗'}</td>
</tr>`,
  )
  .join('\n')}
</tbody>
</table>`
}

<h2>Consent Versions (${consentVersions.length})</h2>
${
  consentVersions.length === 0
    ? '<p>No consent versions published.</p>'
    : `<table>
<thead><tr><th>Type</th><th>Version</th><th>Effective</th><th>Created</th></tr></thead>
<tbody>
${consentVersions
  .map(
    (v) => `<tr>
  <td><span class="badge badge-gray">${v.type.toUpperCase()}</span></td>
  <td>${escHtml(v.version)}</td>
  <td>${format(new Date(v.effectiveAt), 'MMM d, yyyy')}</td>
  <td>${format(new Date(v.createdAt), 'MMM d, yyyy')}</td>
</tr>`,
  )
  .join('\n')}
</tbody>
</table>`
}

</div>
<div class="footer">
  CATS-AI &middot; University of Kentucky &middot; Confidential
</div>
</body>
</html>`
}
