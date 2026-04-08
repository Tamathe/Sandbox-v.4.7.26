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

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { name, email, date, message } = parsed.data as { name: string; email: string; date: string; message?: string }

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  if (!date || typeof date !== 'string') {
    return NextResponse.json({ error: 'Preferred date is required' }, { status: 400 })
  }

  const trimmedName = name.trim()
  const trimmedMessage = message?.trim() || ''

  // Email to CATS-AI team
  const teamHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">THE SANDBOX</h1>
        <p style="color:#93c5fd;margin:4px 0 0">New Follow-Up Request</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#374151;margin:0 0 20px">
          An evaluator has requested a follow-up conversation.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px">Name</td><td style="padding:8px 0;font-weight:700;color:#1f2937">${escapeHtml(trimmedName)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0;font-weight:700;color:#1f2937"><a href="mailto:${encodeURI(email)}" style="color:#0033A0">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Preferred Date</td><td style="padding:8px 0;font-weight:700;color:#1f2937">${escapeHtml(date)}</td></tr>
          ${trimmedMessage ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:8px 0;color:#374151">${escapeHtml(trimmedMessage)}</td></tr>` : ''}
        </table>
      </div>
    </div>
  `

  // Confirmation email to evaluator
  const confirmHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">THE SANDBOX</h1>
        <p style="color:#93c5fd;margin:4px 0 0">Follow-Up Confirmed</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#374151;margin:0 0 16px">
          Hi ${escapeHtml(trimmedName)},
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 20px">
          Thank you for your interest in the University of Kentucky platform! We've received your request for a follow-up conversation and will be in touch soon.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#6b7280;width:140px">Preferred Date</td><td style="padding:6px 0;font-weight:700;color:#1f2937">${escapeHtml(date)}</td></tr>
          ${trimmedMessage ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top">Your Message</td><td style="padding:6px 0;color:#374151">${escapeHtml(trimmedMessage)}</td></tr>` : ''}
        </table>
        <p style="font-size:13px;color:#9ca3af;margin:0">
          University of Kentucky — CATS-AI
        </p>
      </div>
    </div>
  `

  try {
    await sendEmail({
      to: 'cats-ai@uky.edu',
      subject: `Sandbox Follow-Up Request — ${trimmedName}`,
      html: teamHtml,
    })
    await sendEmail({
      to: email,
      subject: 'Your Sandbox Follow-Up Request',
      html: confirmHtml,
    })
  } catch (err) {
    console.error('[evaluate/schedule-followup] Email send failed:', err)
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})
