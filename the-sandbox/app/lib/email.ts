// Email utility — uses Resend when RESEND_API_KEY is set, logs to console otherwise
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'The Sandbox <noreply@thesandbox.uky.edu>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  if (!resend) {
    console.log(`[email] No RESEND_API_KEY — would send to ${to}: ${subject}`)
    return
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) console.error('[email] Send failed:', error)
}

// ─── Bracket digest email ─────────────────────────────────────────────────────

export function bracketDigestHtml({
  poolName,
  standings,
  weekRecap,
}: {
  poolName: string
  standings: { rank: number; name: string; score: number; isYou: boolean }[]
  weekRecap: string
}): string {
  const rows = standings
    .map(
      s => `
      <tr style="background:${s.isYou ? '#e8f0fe' : 'white'}">
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${s.rank}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:${s.isYou ? 700 : 400}">${s.name}${s.isYou ? ' (you)' : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${s.score} pts</td>
      </tr>`
    )
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">🏀 Bracket Update — ${poolName}</h1>
        <p style="color:#93c5fd;margin:4px 0 0">Weekly standings digest</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="font-size:16px;color:#374151;margin-top:0">Standings</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">#</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Name</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">Score</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${weekRecap ? `<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:6px;font-size:14px;color:#374151"><strong>This week:</strong> ${weekRecap}</div>` : ''}
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">
          You're receiving this because you're in a bracket pool on
          <a href="https://thesandbox.uky.edu" style="color:#0033A0">The Sandbox</a>.
        </p>
      </div>
    </div>`
}

// ─── Book digest email ────────────────────────────────────────────────────────

export function bookDigestHtml({
  matches,
}: {
  matches: { title: string; author: string; why: string; link: string }[]
}): string {
  if (matches.length === 0) return ''

  const cards = matches
    .map(
      m => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
        <h3 style="margin:0 0 4px;font-size:16px;color:#1f2937">${m.title}</h3>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280">by ${m.author}</p>
        <p style="margin:0 0 12px;font-size:14px;color:#374151">${m.why}</p>
        <a href="${m.link}" style="font-size:13px;color:#0033A0;font-weight:600">Learn more →</a>
      </div>`
    )
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">📚 New Books For You This Week</h1>
        <p style="color:#93c5fd;margin:4px 0 0">Matched to your reading taste</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
        ${cards}
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">
          You're receiving this from the Book Recommender on
          <a href="https://thesandbox.uky.edu" style="color:#0033A0">The Sandbox</a>.
          <a href="https://thesandbox.uky.edu/tools/book-recommender" style="color:#0033A0">Manage your digest settings</a>.
        </p>
      </div>
    </div>`
}
