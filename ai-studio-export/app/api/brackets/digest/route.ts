import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { sendEmail, bracketDigestHtml } from '../../../lib/email'
import { verifyCronSecret } from '../../../lib/server-auth'

// POST /api/brackets/digest — weekly cron trigger (Vercel Cron)
// Sends standings digest to all active bracket email subscribers
export async function POST(req: NextRequest) {
  const cronError = verifyCronSecret(req)
  if (cronError) return cronError

  const subs = await prisma.bracketEmailSub.findMany({
    where: { active: true },
    include: {
      pool: {
        include: {
          entries: {
            include: { user: { select: { name: true } } },
            orderBy: { score: 'desc' },
          },
        },
      },
      user: { select: { id: true } },
    },
  })

  let sent = 0
  for (const sub of subs) {
    const pool = sub.pool
    if (!pool.locked && pool.entries.every(e => e.score === 0)) continue // tournament hasn't started

    const standings = pool.entries.map((e, i) => ({
      rank: i + 1,
      name: e.user.name,
      score: e.score,
      isYou: e.userId === sub.userId,
    }))

    const html = bracketDigestHtml({
      poolName: pool.name,
      standings,
      weekRecap: '',
    })

    await sendEmail({
      to: sub.email,
      subject: `🏀 Bracket Update: ${pool.name} — Week ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html,
    })
    sent++
  }

  return NextResponse.json({ sent })
}
