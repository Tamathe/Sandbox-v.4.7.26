import { LeagueCadence, LeagueKind } from '../../../generated/prisma'

import type {
  InitialCycleSeed,
  JsonObject,
  LeagueAdapter,
  LeagueMemberSnapshot,
  ResolveCycleResult,
} from '../types'

function asObject(input: unknown) {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
}

function parseStringList(input: unknown) {
  if (Array.isArray(input)) {
    return input
      .map((value) => String(value).trim())
      .filter(Boolean)
  }

  if (typeof input === 'string') {
    return input
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
  }

  return []
}

function parseDate(input: unknown, fallbackDaysFromNow = 6) {
  const candidate =
    typeof input === 'string' && input.trim()
      ? new Date(input)
      : new Date(Date.now() + fallbackDaysFromNow * 24 * 60 * 60 * 1000)

  if (Number.isNaN(candidate.getTime())) {
    throw new Error('Please choose a valid deadline for this survivor week.')
  }

  return candidate
}

function buildConfig(input: unknown) {
  const record = asObject(input)
  const seasonName = String(record.seasonName ?? '').trim() || 'Season Survivor Pool'
  const availableTeams = parseStringList(record.availableTeams)
  const weekNumber = Math.max(1, Number(record.weekNumber ?? 1) || 1)
  const weekLabel = String(record.weekLabel ?? '').trim() || `Week ${weekNumber}`
  const closesAt = parseDate(record.closesAt)
  const cadence =
    record.cadence === LeagueCadence.SEASONAL ? LeagueCadence.SEASONAL : LeagueCadence.WEEKLY

  if (availableTeams.length < 2) {
    throw new Error('Survivor Pool needs at least two available teams.')
  }

  return {
    seasonName,
    defaultTeams: availableTeams,
    cadence,
    initialWeek: {
      weekNumber,
      weekLabel,
      closesAt: closesAt.toISOString(),
      availableTeams,
    },
  } satisfies JsonObject
}

function buildCycle(weekNumber: number, label: string, availableTeams: string[], closesAt: Date): InitialCycleSeed {
  return {
    label,
    opensAt: new Date(),
    locksAt: closesAt,
    closesAt,
    stateJson: {
      weekNumber,
      availableTeams,
    },
  }
}

function memberState(member: LeagueMemberSnapshot) {
  const stats = member.statsJson ?? {}
  const usedTeams = Array.isArray(stats.usedTeams)
    ? stats.usedTeams.map((value) => String(value))
    : []

  return {
    usedTeams,
    eliminated: Boolean(stats.eliminated),
    survivedCount: Number(stats.survivedCount ?? 0) || 0,
  }
}

export const survivorPoolAdapter: LeagueAdapter = {
  kind: LeagueKind.SURVIVOR_POOL,
  defaultCadence: LeagueCadence.WEEKLY,
  defaultScoringMetric: 'weeks_survived',
  validateCreateConfig(input) {
    return buildConfig(input)
  },
  createInitialCycles(config) {
    const initialWeek = asObject(config.initialWeek)
    return [
      buildCycle(
        Math.max(1, Number(initialWeek.weekNumber ?? 1) || 1),
        String(initialWeek.weekLabel ?? 'Week 1'),
        parseStringList(initialWeek.availableTeams),
        parseDate(initialWeek.closesAt)
      ),
    ]
  },
  createCycle({ input, previousCycle }) {
    const record = asObject(input)
    const availableTeams = parseStringList(record.availableTeams)
    const weekNumber = Math.max(1, Number(record.weekNumber ?? previousCycle?.stateJson.weekNumber ?? 1) || 1)
    const weekLabel = String(record.weekLabel ?? '').trim() || `Week ${weekNumber}`
    const closesAt = parseDate(record.closesAt)

    if (availableTeams.length < 2) {
      throw new Error('Each survivor week needs at least two team options.')
    }

    return buildCycle(weekNumber, weekLabel, availableTeams, closesAt)
  },
  buildNextCycle({ league, previousCycle, cycleNumber, now }) {
    const defaultTeams = parseStringList(league.configJson.defaultTeams)
    const availableTeams =
      defaultTeams.length > 0 ? defaultTeams : parseStringList(previousCycle.stateJson.availableTeams)

    if (availableTeams.length < 2) {
      return null
    }

    const closesAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
    return buildCycle(cycleNumber, `Week ${cycleNumber}`, availableTeams, closesAt)
  },
  validateSubmission({ input, cycle, member }) {
    const record = asObject(input)
    const pick = String(record.pick ?? '').trim()
    const availableTeams = parseStringList(cycle.stateJson.availableTeams)
    const state = memberState(member)

    if (state.eliminated) {
      throw new Error('This member has already been eliminated from the pool.')
    }

    if (!pick || !availableTeams.includes(pick)) {
      throw new Error('Pick one of the teams listed for this week.')
    }

    if (state.usedTeams.includes(pick)) {
      throw new Error('You cannot reuse a team in Survivor Pool.')
    }

    return {
      pick,
    }
  },
  resolveCycle({ cycle, members, submissions, resolutionInput }) {
    const record = asObject(resolutionInput)
    const winningTeams = parseStringList(record.winningTeams)

    if (winningTeams.length === 0) {
      throw new Error('Resolution must include the teams that won this week.')
    }

    const submissionUpdates: ResolveCycleResult['submissionUpdates'] = []
    const standingUpdates: ResolveCycleResult['standingUpdates'] = []
    const memberStatsUpdates: NonNullable<ResolveCycleResult['memberStatsUpdates']> = []

    for (const submission of submissions) {
      const member = members.find((candidate) => candidate.id === submission.memberId)
      if (!member) continue

      const currentState = memberState(member)
      const pick = String(submission.payloadJson.pick ?? '')
      const survived = winningTeams.includes(pick)
      const usedTeams = currentState.usedTeams.includes(pick)
        ? currentState.usedTeams
        : [...currentState.usedTeams, pick]

      submissionUpdates.push({
        memberId: submission.memberId,
        status: 'RESOLVED',
        scoreDelta: survived ? 1 : 0,
        payloadJson: {
          ...submission.payloadJson,
          outcome: survived ? 'SURVIVED' : 'ELIMINATED',
        },
      })

      standingUpdates.push({
        memberId: submission.memberId,
        scoreDelta: survived ? 1 : 0,
        winsDelta: survived ? 1 : 0,
        lossesDelta: survived ? 0 : 1,
        streak: survived ? (member.standing?.streak ?? 0) + 1 : 0,
        metadataJson: {
          alive: survived,
          lastPick: pick,
          lastOutcome: survived ? 'SURVIVED' : 'ELIMINATED',
        },
      })

      memberStatsUpdates.push({
        memberId: submission.memberId,
        statsJson: {
          usedTeams,
          eliminated: !survived,
          survivedCount: currentState.survivedCount + (survived ? 1 : 0),
        },
      })
    }

    return {
      summaryJson: {
        winningTeams,
        resolvedAt: new Date().toISOString(),
      },
      submissionUpdates,
      standingUpdates,
      memberStatsUpdates,
      events: [
        {
          type: 'cycle_resolved',
          message: `${cycle.label} has been scored and the pool standings are updated.`,
          payloadJson: {
            winningTeams,
          },
        },
      ],
    }
  },
  rankStandings(standings) {
    return [...standings]
      .sort((a, b) => {
        const aAlive = typeof a.metadataJson?.alive === 'boolean' ? Number(a.metadataJson.alive) : 1
        const bAlive = typeof b.metadataJson?.alive === 'boolean' ? Number(b.metadataJson.alive) : 1
        if (bAlive !== aAlive) return bAlive - aAlive
        if (b.score !== a.score) return b.score - a.score
        if (b.wins !== a.wins) return b.wins - a.wins
        return a.name.localeCompare(b.name)
      })
      .map((standing) => standing.memberId)
  },
  buildDigest({ league, currentCycle, currentStanding }) {
    const rankLine =
      currentStanding?.rank != null
        ? `You're sitting #${currentStanding.rank} in ${league.name}.`
        : `You're in ${league.name}.`

    const cycleLine = currentCycle
      ? `${currentCycle.label} is live. Make your pick before lock.`
      : 'No survivor week is open right now.'

    return {
      subject: `Survivor Pool Monday: ${league.name}`,
      preheader: cycleLine,
      intro: `${rankLine} ${cycleLine}`,
      highlight:
        currentStanding && typeof currentStanding.metadataJson?.alive === 'boolean' && !currentStanding.metadataJson.alive
          ? 'You were eliminated last round, but the standings are still fun to watch.'
          : 'Stay alive. One smart pick at a time.',
    }
  },
}
