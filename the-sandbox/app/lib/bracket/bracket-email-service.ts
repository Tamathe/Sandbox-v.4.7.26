import { prisma } from '../prisma'
import { sendEmail, escapeHtml } from '../email'
import { generateEmailNarrative } from './host-service'
import type { BracketEmailLog } from '../../generated/prisma'

export async function sendRoundUpdateEmail(
  contestId: string,
  _triggeredByUserId: string
): Promise<BracketEmailLog> {
  // 1. Fetch contest + entries with user emails
  const [contest, entries] = await Promise.all([
    prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } }),
    prisma.bracketEntry.findMany({
      where: { contestId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { score: 'desc' },
    }),
  ])

  // Determine latest round for label
  const latestResult = await prisma.bracketResult.findFirst({
    where: { contestId },
    orderBy: { round: 'desc' },
  })
  const currentRound = latestResult?.round

  // 2. Generate AI narrative
  const narrative = await generateEmailNarrative(contestId)

  // 3. Build HTML email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thesandbox.uky.edu'
  const roundLabel = currentRound !== undefined ? `Round ${currentRound}` : 'Latest Update'

  const rows = entries
    .map(
      (e, i) => `
      <tr style="background:${i === 0 ? '#fef9c3' : 'white'}">
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:${i === 0 ? 700 : 400}">${escapeHtml(e.user.name ?? '')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${e.score}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280">${e.maxPossible}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${
          e.isEliminated
            ? '<span style="color:#dc2626;font-size:11px;font-weight:600">OUT</span>'
            : ''
        }</td>
      </tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">🏀 ${contest.name} — ${roundLabel}</h1>
        <p style="color:#93c5fd;margin:4px 0 0">NCAA March Madness 2026</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px;color:#374151;line-height:1.6">
          ${escapeHtml(narrative.trim()).replace(/\n/g, '<br>')}
        </div>
        <h2 style="font-size:16px;color:#374151;margin:0 0 12px">Standings</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">#</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Name</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">Score</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">Max</th>
              <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;margin-top:24px">
          <a href="${appUrl}/bracket/${contestId}"
             style="display:inline-block;background:#0033A0;color:white;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px">
            Check Your Bracket →
          </a>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center">
          You're receiving this because you're in <strong>${contest.name}</strong> on
          <a href="${appUrl}" style="color:#0033A0">University of Kentucky</a>.
        </p>
      </div>
    </div>`

  // 4. Send to all players
  const emails = entries.map((e) => e.user.email).filter(Boolean) as string[]
  const subject = `🏀 ${contest.name} — ${roundLabel} Update`

  if (process.env.RESEND_API_KEY) {
    await Promise.all(emails.map((email) => sendEmail({ to: email, subject, html })))
  } else {
    console.info(
      `[bracket-email] No RESEND_API_KEY — would send "${subject}" to ${emails.length} players`
    )
  }

  // 5. Create email log record
  const log = await prisma.bracketEmailLog.create({
    data: {
      contestId,
      round: currentRound ?? null,
      subject,
      aiNarrative: narrative,
      recipientCount: emails.length,
    },
  })

  return log
}
