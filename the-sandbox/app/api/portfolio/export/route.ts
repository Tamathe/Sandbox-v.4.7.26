import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import type { PortfolioType } from '../../../generated/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

function typeLabel(type: PortfolioType): string {
  const map: Record<PortfolioType, string> = {
    EDUCATION: 'Education',
    EXPERIENCE: 'Experience',
    PROJECT: 'Project',
    AWARD: 'Award',
    CERTIFICATION: 'Certification',
    PUBLICATION: 'Publication',
    SKILL: 'Skill',
  }
  return map[type] ?? type
}

function formatDate(d: Date | null): string {
  if (!d) return 'Present'
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const items = await prisma.portfolioItem.findMany({
    where: { userId: user.id },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  })

  const sessionStats = await prisma.toolSession.groupBy({
    by: ['toolId'],
    where: { userId: user.id, endedAt: { not: null } },
    _count: { id: true },
  })

  const totalSessions = sessionStats.reduce((sum, s) => sum + s._count.id, 0)
  const uniqueToolCount = sessionStats.length

  const allSkills = Array.from(
    new Set(items.flatMap((item) => item.skills))
  ).sort((a, b) => a.localeCompare(b))

  const itemsHtml = items.length === 0
    ? '<p style="color:#64748b;font-style:italic;">No portfolio items yet.</p>'
    : items.map((item) => {
        const dateRange = item.startDate
          ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
          : item.endDate
            ? formatDate(item.endDate)
            : ''

        const skillPills = item.skills.map((s) =>
          `<span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9999px;padding:2px 10px;font-size:12px;color:#475569;margin:2px 2px 2px 0;">${esc(s)}</span>`
        ).join('')

        const verifiedBadge = item.isVerified
          ? '<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9999px;padding:2px 10px;font-size:11px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-left:6px;">AI Verified</span>'
          : ''

        return `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:16px;">
          <div style="margin-bottom:8px;">
            <span style="display:inline-block;background:#f1f5f9;border-radius:9999px;padding:3px 12px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">${esc(typeLabel(item.type))}</span>${verifiedBadge}
          </div>
          <h3 style="margin:0 0 4px 0;font-size:17px;font-weight:700;color:#0f172a;">${esc(item.title)}</h3>
          ${item.organization ? `<p style="margin:0 0 2px 0;font-size:14px;font-weight:500;color:#475569;">${esc(item.organization)}</p>` : ''}
          ${dateRange ? `<p style="margin:0 0 10px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">${esc(dateRange)}</p>` : ''}
          ${item.description ? `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#475569;white-space:pre-wrap;">${esc(item.description)}</p>` : ''}
          ${skillPills ? `<div style="margin-top:8px;">${skillPills}</div>` : ''}
        </div>`
      }).join('')

  const skillsHtml = allSkills.length === 0
    ? '<p style="color:#64748b;font-style:italic;font-size:13px;">No skills listed yet.</p>'
    : allSkills.map((s) =>
        `<span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9999px;padding:4px 12px;font-size:13px;color:#475569;margin:3px 3px 3px 0;">${esc(s)}</span>`
      ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(user.name)} — Sandbox Portfolio</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    @media print {
      body { background: #fff; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#0033A0;color:#fff;text-align:center;padding:10px 16px;font-size:13px;">
    To save as PDF: <strong>File → Print → Save as PDF</strong>
  </div>

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0033A0,#1d4ed8);color:#fff;padding:40px 0;">
    <div style="max-width:720px;margin:0 auto;padding:0 24px;">
      <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.15em;color:#bfdbfe;">University of Kentucky</p>
      <h1 style="margin:0 0 6px 0;font-size:28px;font-weight:800;">${esc(user.name)}</h1>
      ${(user.department || user.college) ? `<p style="margin:0;font-size:14px;color:#bfdbfe;">${esc([user.department, user.college].filter(Boolean).join(' · '))}</p>` : ''}
      <div style="display:flex;gap:32px;margin-top:20px;">
        <div style="text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:800;">${items.length}</p>
          <p style="margin:0;font-size:11px;color:#bfdbfe;">portfolio items</p>
        </div>
        <div style="text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:800;">${totalSessions}</p>
          <p style="margin:0;font-size:11px;color:#bfdbfe;">sessions completed</p>
        </div>
        <div style="text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:800;">${uniqueToolCount}</p>
          <p style="margin:0;font-size:11px;color:#bfdbfe;">tools used</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Main content -->
  <div style="max-width:720px;margin:0 auto;padding:32px 24px;">
    <div style="display:grid;grid-template-columns:1fr 220px;gap:24px;">
      <!-- Portfolio items -->
      <div>
        <h2 style="margin:0 0 16px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;">Portfolio</h2>
        ${itemsHtml}
      </div>

      <!-- Sidebar -->
      <div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:16px;">
          <h3 style="margin:0 0 12px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;">Skills</h3>
          ${skillsHtml}
        </div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#0033A0;">Powered by</p>
          <p style="margin:4px 0 0 0;font-size:15px;font-weight:800;color:#0033A0;">University of Kentucky</p>
          <p style="margin:4px 0 0 0;font-size:11px;color:#3b82f6;">AI-powered learning at<br>the University of Kentucky</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="uky-portfolio.html"',
    },
  })
})
