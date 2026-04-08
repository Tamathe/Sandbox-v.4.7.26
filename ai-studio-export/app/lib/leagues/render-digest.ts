import type { LeagueDigest, LeagueStandingSnapshot } from './types'

export function renderLeagueDigestHtml(args: {
  leagueName: string
  digest: LeagueDigest
  standings: LeagueStandingSnapshot[]
  currentStanding: LeagueStandingSnapshot | null
}) {
  const rows = args.standings
    .slice(0, 8)
    .map(
      (standing) => `
        <tr style="background:${standing.memberId === args.currentStanding?.memberId ? '#eff6ff' : 'white'}">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${standing.rank ?? '-'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${standing.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${standing.score.toFixed(0)}</td>
        </tr>
      `
    )
    .join('')

  const action =
    args.digest.actionLabel && args.digest.actionUrl
      ? `<a href="${args.digest.actionUrl}" style="display:inline-block;margin-top:20px;background:#0033A0;color:white;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600">${args.digest.actionLabel}</a>`
      : ''

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#111827">
      <div style="background:#0033A0;padding:24px 28px;border-radius:10px 10px 0 0">
        <h1 style="margin:0;color:white;font-size:22px">${args.leagueName}</h1>
        <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px">${args.digest.preheader}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;background:white;padding:24px 28px;border-radius:0 0 10px 10px">
        <p style="margin-top:0;font-size:15px;line-height:1.6">${args.digest.intro}</p>
        ${
          args.digest.highlight
            ? `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:18px 0;font-size:14px;line-height:1.5"><strong>Highlight:</strong> ${args.digest.highlight}</div>`
            : ''
        }
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;color:#6b7280">#</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280">Member</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280">Score</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${action}
      </div>
    </div>
  `
}
