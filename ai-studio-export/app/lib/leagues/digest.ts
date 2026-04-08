import { LeagueCadence, LeagueStatus } from '../../generated/prisma'
import { sendEmail } from '../email'
import { prisma } from '../prisma'

import { getLeagueAdapter } from './adapters'
import {
  leagueDetailInclude,
  maybeCreateNextCycleForWeeklyLeague,
  serializeLeagueDetail,
} from './core'
import { renderLeagueDigestHtml } from './render-digest'

export async function sendLeagueDigest(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: leagueDetailInclude,
  })

  if (!league || league.status !== LeagueStatus.ACTIVE) {
    return 0
  }

  const adapter = getLeagueAdapter(league.kind)
  const serialized = league.emailSubs.filter((sub) => sub.active)
  const detailByUser = new Map<string, ReturnType<typeof serializeLeagueDetail>>()

  let sent = 0
  for (const sub of serialized) {
    const detail =
      detailByUser.get(sub.userId) ??
      serializeLeagueDetail(league, sub.userId)

    detailByUser.set(sub.userId, detail)

    const member = detail.members.find((entry) => entry.userId === sub.userId)
    if (!member) continue

    const currentStanding = detail.standings.find((entry) => entry.userId === sub.userId) ?? null
    const currentCycle = detail.cycles.find((cycle) => cycle.status === 'OPEN' || cycle.status === 'LOCKED') ?? null
    const previousCycle = detail.cycles.find((cycle) => cycle.status === 'RESOLVED') ?? null

    const digest = adapter.buildDigest({
      league: {
        id: detail.id,
        name: detail.name,
        slug: detail.slug,
        description: detail.description,
        kind: detail.kind,
        cadence: detail.cadence,
        timezone: detail.timezone,
        configJson: detail.configJson,
        scoringMetric: detail.scoringMetric,
        toolId: null,
      },
      member,
      currentStanding,
      currentCycle,
      previousCycle,
      topStandings: detail.standings,
    })

    const html = renderLeagueDigestHtml({
      leagueName: detail.name,
      digest,
      standings: detail.standings,
      currentStanding,
    })

    await sendEmail({
      to: sub.email,
      subject: digest.subject,
      html,
    })

    sent += 1
  }

  return sent
}

export async function runLeagueMondayDigestJob() {
  const now = new Date()
  const leagues = await prisma.league.findMany({
    where: {
      status: LeagueStatus.ACTIVE,
      cadence: LeagueCadence.WEEKLY,
      emailSubs: {
        some: {
          active: true,
        },
      },
      OR: [{ nextDigestAt: null }, { nextDigestAt: { lte: now } }],
    },
    select: {
      id: true,
    },
  })

  let sent = 0
  for (const league of leagues) {
    await maybeCreateNextCycleForWeeklyLeague(league.id)
    sent += await sendLeagueDigest(league.id)

    await prisma.league.update({
      where: { id: league.id },
      data: {
        nextDigestAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    })
  }

  return {
    leaguesProcessed: leagues.length,
    emailsSent: sent,
  }
}
