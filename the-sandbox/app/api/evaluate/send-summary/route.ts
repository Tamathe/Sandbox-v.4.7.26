import { NextRequest, NextResponse } from 'next/server'

import { sendEmail, escapeHtml } from '../../../lib/email'
import { checkRateLimit } from '../../../lib/rate-limit'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const rateLimited = await checkRateLimit(req, null, 'API')
  if (rateLimited) return rateLimited

  interface SessionLogEntry {
    timestamp: string
    action: string
    detail?: string
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { email, timeSpent, stepsCompleted, totalSteps, metrics, sessionLog, nps, roi, wishlist } = parsed.data as {
    email: string
    timeSpent: string
    stepsCompleted: number
    totalSteps: number
    metrics: { toolCount: number | null; activeStudents: number | null; avgSessionScore: number | null }
    sessionLog?: SessionLogEntry[]
    nps?: { score: number; comment?: string }
    roi?: { students: number; faculty: number }
    wishlist?: string[]
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  const metricsRows: string[] = []
  if (metrics?.toolCount != null) {
    metricsRows.push(`<tr><td style="padding:8px 16px;color:#6b7280">AI Tools Published</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">${metrics.toolCount}</td></tr>`)
  }
  if (metrics?.activeStudents != null) {
    metricsRows.push(`<tr><td style="padding:8px 16px;color:#6b7280">Active Students</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">${metrics.activeStudents}</td></tr>`)
  }
  if (metrics?.avgSessionScore != null) {
    metricsRows.push(`<tr><td style="padding:8px 16px;color:#6b7280">Avg Session Score</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">${Math.round(metrics.avgSessionScore * 100)}%</td></tr>`)
  }

  const metricsSection = metricsRows.length > 0 ? `
    <div style="margin:24px 0">
      <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">Platform Metrics Discovered</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:8px">
        ${metricsRows.join('')}
      </table>
    </div>
  ` : ''

  const actionLabels: Record<string, string> = {
    'page-visit': 'Visited',
    'tool-built': 'Built an AI tool',
    'sandy-opened': 'Opened Sandy concierge',
    'analytics-viewed': 'Viewed analytics',
    'tour-started': 'Started guided tour',
    'tour-completed': 'Completed guided tour',
    'evaluation-ended': 'Ended evaluation',
  }

  const timelineSection = sessionLog && sessionLog.length > 0 ? `
    <div style="margin:24px 0">
      <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">Session Timeline</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:8px">
        ${sessionLog.map(entry => {
          const time = new Date(entry.timestamp)
          const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          const label = actionLabels[entry.action] || escapeHtml(entry.action)
          const detail = entry.detail ? ` <span style="color:#9ca3af">${escapeHtml(entry.detail)}</span>` : ''
          return `<tr><td style="padding:6px 12px;color:#6b7280;white-space:nowrap;font-family:monospace;font-size:12px;border-bottom:1px solid #f3f4f6">${timeStr}</td><td style="padding:6px 12px;color:#374151;border-bottom:1px solid #f3f4f6">${label}${detail}</td></tr>`
        }).join('')}
      </table>
    </div>
  ` : ''

  const npsColor = nps ? (nps.score >= 9 ? '#16a34a' : nps.score >= 7 ? '#d97706' : '#dc2626') : ''
  const npsLabel = nps ? (nps.score >= 9 ? 'Promoter' : nps.score >= 7 ? 'Passive' : 'Detractor') : ''
  const npsSection = nps != null ? `
    <div style="margin:24px 0;padding:16px 20px;border:2px solid ${npsColor};border-radius:8px;background:${nps.score >= 9 ? '#f0fdf4' : nps.score >= 7 ? '#fffbeb' : '#fef2f2'}">
      <h2 style="font-size:16px;color:#1f2937;margin:0 0 8px">Net Promoter Score</h2>
      <p style="font-size:32px;font-weight:800;color:${npsColor};margin:0">${nps.score}/10 <span style="font-size:13px;font-weight:600">${npsLabel}</span></p>
      ${nps.comment ? `<p style="font-size:13px;color:#6b7280;margin:8px 0 0;font-style:italic">&ldquo;${escapeHtml(nps.comment)}&rdquo;</p>` : ''}
    </div>
  ` : ''

  // ROI section
  const roiSection = roi ? (() => {
    const toolsCreated = roi.faculty * 3
    const interactions = roi.students * 8
    const hoursSaved = roi.faculty * 12
    const annualSavings = hoursSaved * 2 * 75
    return `
    <div style="margin:24px 0">
      <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">ROI Estimate</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 12px">Based on ${roi.students.toLocaleString()} students and ${roi.faculty.toLocaleString()} faculty</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:8px">
        <tr><td style="padding:8px 16px;color:#6b7280">Tools Created</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">${toolsCreated.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 16px;color:#6b7280">Student Interactions / Semester</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">${interactions.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 16px;color:#6b7280">Faculty Hours Saved / Semester</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">${hoursSaved.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 16px;color:#6b7280">Cost per Interaction</td><td style="padding:8px 16px;font-weight:700;color:#0033A0;text-align:right">$0.03</td></tr>
        <tr style="background:#eff6ff"><td style="padding:8px 16px;color:#1f2937;font-weight:600">Est. Annual Savings</td><td style="padding:8px 16px;font-weight:800;color:#0033A0;text-align:right;font-size:16px">$${annualSavings.toLocaleString()}</td></tr>
      </table>
    </div>
    `
  })() : ''

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">THE SANDBOX</h1>
        <p style="color:#93c5fd;margin:4px 0 0">Your Evaluation Summary</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#374151;margin:0 0 20px">
          Thank you for exploring the University of Kentucky platform. Here's a summary of your evaluation session.
        </p>

        <div style="display:flex;gap:24px;margin-bottom:24px">
          <div>
            <p style="font-size:12px;color:#6b7280;margin:0">Time Exploring</p>
            <p style="font-size:20px;font-weight:700;color:#1f2937;margin:4px 0 0">${timeSpent}</p>
          </div>
          <div>
            <p style="font-size:12px;color:#6b7280;margin:0">Steps Completed</p>
            <p style="font-size:20px;font-weight:700;color:#0033A0;margin:4px 0 0">${stepsCompleted}/${totalSteps}</p>
          </div>
        </div>

        ${metricsSection}

        ${timelineSection}

        ${npsSection}

        ${roiSection}

        ${wishlist && wishlist.length > 0 ? `
        <div style="margin:24px 0">
          <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">Features of Interest</h2>
          <ul style="padding:0 0 0 20px;margin:0;font-size:14px;color:#374151">
            ${wishlist.map(f => `<li style="margin-bottom:6px">${escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="margin:24px 0;padding:20px;background:#f8fafc;border-radius:8px">
          <h2 style="font-size:16px;color:#1f2937;margin:0 0 16px">Why University of Kentucky</h2>
          <ul style="padding:0;margin:0;list-style:none;font-size:14px;color:#374151">
            <li style="margin-bottom:10px"><strong>Zero-Code AI Tool Creation</strong> — Faculty describe a learning experience in plain language. The AI generates it live.</li>
            <li style="margin-bottom:10px"><strong>Real-Time Learning Analytics</strong> — Every interaction generates measurable learning signals before grades are due.</li>
            <li style="margin-bottom:10px"><strong>FERPA-Compliant by Design</strong> — Built with institutional compliance from day one.</li>
            <li style="margin-bottom:10px"><strong>University-Wide Scale</strong> — One platform serves every college and department.</li>
            <li style="margin-bottom:0"><strong>Pedagogy-First AI</strong> — Grounded in learning objectives and evidence-based pedagogy.</li>
          </ul>
        </div>

        <div style="text-align:center;margin-top:32px">
          <a href="mailto:cats-ai@uky.edu?subject=The%20Sandbox%20%E2%80%94%20Follow-Up%20Discussion" style="display:inline-block;background:#0033A0;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            Schedule a Follow-Up
          </a>
        </div>

        <p style="margin-top:32px;font-size:12px;color:#9ca3af;text-align:center">
          University of Kentucky — CATS-AI
        </p>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: email,
      subject: 'Your Sandbox Evaluation Summary',
      html,
    })
  } catch (err) {
    console.error('[evaluate/send-summary] Email send failed:', err)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})
