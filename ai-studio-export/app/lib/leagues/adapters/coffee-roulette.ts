import { LeagueCadence, LeagueKind } from '../../../generated/prisma'

import type {
  LeagueAdapter,
  LeagueMemberSnapshot,
  ResolveCycleResult,
} from '../types'

function asObject(input: unknown) {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
}

function parseDate(input: unknown, fallbackDaysFromNow = 7) {
  const candidate =
    typeof input === 'string' && input.trim()
      ? new Date(input)
      : new Date(Date.now() + fallbackDaysFromNow * 24 * 60 * 60 * 1000)

  if (Number.isNaN(candidate.getTime())) {
    throw new Error('Please choose a valid meeting deadline.')
  }

  return candidate
}

function getMetUsers(member: LeagueMemberSnapshot) {
  const stats = member.statsJson ?? {}
  return Array.isArray(stats.metUsers) ? stats.metUsers.map((value) => String(value)) : []
}

function buildPairings(members: LeagueMemberSnapshot[]) {
  const remaining = [...members].sort((a, b) => a.name.localeCompare(b.name))
  const pairings: Array<{ memberAId: string; memberAName: string; memberBId: string | null; memberBName: string | null }> = []

  while (remaining.length > 1) {
    const current = remaining.shift()!
    const seen = new Set(getMetUsers(current))
    let partnerIndex = remaining.findIndex((candidate) => !seen.has(candidate.userId))
    if (partnerIndex === -1) partnerIndex = 0
    const partner = remaining.splice(partnerIndex, 1)[0]

    pairings.push({
      memberAId: current.id,
      memberAName: current.name,
      memberBId: partner.id,
      memberBName: partner.name,
    })
  }

  if (remaining.length === 1) {
    const last = remaining[0]
    pairings.push({
      memberAId: last.id,
      memberAName: last.name,
      memberBId: null,
      memberBName: null,
    })
  }

  return pairings
}

export const coffeeRouletteAdapter: LeagueAdapter = {
  kind: LeagueKind.COFFEE_ROULETTE,
  defaultCadence: LeagueCadence.WEEKLY,
  defaultScoringMetric: 'connections',
  validateCreateConfig(input) {
    const record = asObject(input)
    const prompt = String(record.prompt ?? '').trim() || 'Find 15 minutes and ask one better-than-small-talk question.'
    const closesAt = parseDate(record.closesAt)

    return {
      prompt,
      closesAt: closesAt.toISOString(),
    }
  },
  createInitialCycles(config) {
    const closesAt = parseDate(config.closesAt)
    return [
      {
        label: 'Week 1',
        opensAt: new Date(),
        locksAt: closesAt,
        closesAt,
        stateJson: {
          prompt: String(config.prompt ?? ''),
          pairings: [],
        },
      },
    ]
  },
  createCycle({ input, members, cycleNumber }) {
    const record = asObject(input)
    const closesAt = parseDate(record.closesAt)
    const prompt = String(record.prompt ?? '').trim() || 'Share one surprising thing about your work.'

    return {
      label: String(record.weekLabel ?? '').trim() || `Week ${cycleNumber}`,
      opensAt: new Date(),
      locksAt: closesAt,
      closesAt,
      stateJson: {
        prompt,
        pairings: buildPairings(members),
      },
    }
  },
  buildNextCycle({ members, cycleNumber, now, previousCycle }) {
    const closesAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return {
      label: `Week ${cycleNumber}`,
      opensAt: now,
      locksAt: closesAt,
      closesAt,
      stateJson: {
        prompt:
          String(previousCycle.stateJson.prompt ?? '').trim() ||
          'Share one thing your department should steal from another discipline.',
        pairings: buildPairings(members),
      },
    }
  },
  validateSubmission({ input }) {
    const record = asObject(input)
    return {
      completed: Boolean(record.completed),
      notes: String(record.notes ?? '').trim(),
    }
  },
  resolveCycle({ cycle, members, submissions }) {
    const pairings = Array.isArray(cycle.stateJson.pairings)
      ? cycle.stateJson.pairings
      : []

    const memberStatsUpdates: NonNullable<ResolveCycleResult['memberStatsUpdates']> = []
    const submissionUpdates: ResolveCycleResult['submissionUpdates'] = []
    const standingUpdates: ResolveCycleResult['standingUpdates'] = []

    for (const pairing of pairings) {
      const pair = asObject(pairing)
      const memberAId = String(pair.memberAId ?? '')
      const memberBId = pair.memberBId ? String(pair.memberBId) : null

      for (const memberId of [memberAId, memberBId].filter(Boolean) as string[]) {
        const member = members.find((candidate) => candidate.id === memberId)
        if (!member) continue

        const metUsers = new Set(getMetUsers(member))
        if (memberAId && memberAId !== member.id) metUsers.add(members.find((item) => item.id === memberAId)?.userId ?? '')
        if (memberBId && memberBId !== member.id) metUsers.add(members.find((item) => item.id === memberBId)?.userId ?? '')

        memberStatsUpdates.push({
          memberId: member.id,
          statsJson: {
            metUsers: [...metUsers].filter(Boolean),
            connections: metUsers.size,
          },
        })
      }
    }

    for (const submission of submissions) {
      const completed = Boolean(submission.payloadJson.completed)
      submissionUpdates.push({
        memberId: submission.memberId,
        status: 'RESOLVED',
        scoreDelta: completed ? 1 : 0,
        payloadJson: {
          ...submission.payloadJson,
          outcome: completed ? 'CONFIRMED' : 'SKIPPED',
        },
      })

      standingUpdates.push({
        memberId: submission.memberId,
        scoreDelta: completed ? 1 : 0,
        winsDelta: completed ? 1 : 0,
        lossesDelta: completed ? 0 : 1,
        streak: completed ? 1 : 0,
      })
    }

    return {
      summaryJson: {
        pairings,
        resolvedAt: new Date().toISOString(),
      },
      submissionUpdates,
      standingUpdates,
      memberStatsUpdates,
      events: [
        {
          type: 'cycle_resolved',
          message: `${cycle.label} coffee confirmations are in.`,
        },
      ],
    }
  },
  rankStandings(standings) {
    return [...standings]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.name.localeCompare(b.name)
      })
      .map((standing) => standing.memberId)
  },
  buildDigest({ league, currentCycle }) {
    return {
      subject: `Coffee Roulette Monday: ${league.name}`,
      preheader: currentCycle ? `${currentCycle.label} pairings are ready.` : 'Invite more people to start pairing.',
      intro: currentCycle
        ? `${currentCycle.label} pairings are ready. Take fifteen minutes, meet someone new, and log the connection.`
        : `Invite more people to ${league.name} so the next pairing round has someone to match.`,
      highlight: currentCycle
        ? String(currentCycle.stateJson.prompt ?? '')
        : 'The engine works best once a few people have joined the league.',
    }
  },
}
