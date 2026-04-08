import { LeagueCadence, LeagueKind } from '../../../generated/prisma'

import type {
  InitialCycleSeed,
  JsonObject,
  LeagueAdapter,
  LeagueMemberSnapshot,
  LeagueSubmissionSnapshot,
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

function parseDate(input: unknown, fallbackDaysFromNow = 7) {
  const candidate =
    typeof input === 'string' && input.trim()
      ? new Date(input)
      : new Date(Date.now() + fallbackDaysFromNow * 24 * 60 * 60 * 1000)

  if (Number.isNaN(candidate.getTime())) {
    throw new Error('Please choose a valid close date for the market.')
  }

  return candidate
}

function parseStake(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(1, Math.round(numeric))
}

function parseMarketConfig(input: unknown) {
  const record = asObject(input)
  const question = String(record.question ?? '').trim()
  const options = parseStringList(record.options)
  const description = String(record.description ?? '').trim()
  const stakeMin = parseStake(record.stakeMin, 25)
  const stakeMax = Math.max(stakeMin, parseStake(record.stakeMax, 250))
  const closesAt = parseDate(record.closesAt)
  const locksAt = record.locksAt ? parseDate(record.locksAt, 6) : closesAt
  const cadence =
    record.cadence === LeagueCadence.WEEKLY ? LeagueCadence.WEEKLY : LeagueCadence.ONE_OFF

  if (!question) {
    throw new Error('Prediction Market needs a clear question.')
  }

  if (options.length < 2) {
    throw new Error('Prediction Market needs at least two options.')
  }

  if (options.length > 6) {
    throw new Error('Prediction Market supports up to six options per market.')
  }

  return {
    question,
    options,
    description: description || null,
    stakeMin,
    stakeMax,
    closesAt: closesAt.toISOString(),
    locksAt: locksAt.toISOString(),
    cadence,
  } satisfies JsonObject
}

function buildMarketCycle(config: JsonObject): InitialCycleSeed {
  const question = String(config.question)
  const options = parseStringList(config.options)
  const description = config.description ? String(config.description) : null
  const stakeMin = parseStake(config.stakeMin, 25)
  const stakeMax = parseStake(config.stakeMax, 250)
  const closesAt = parseDate(config.closesAt)
  const locksAt = config.locksAt ? parseDate(config.locksAt) : closesAt

  return {
    label: question,
    opensAt: new Date(),
    locksAt,
    closesAt,
    stateJson: {
      question,
      description,
      options,
      stakeMin,
      stakeMax,
    },
  }
}

function getExistingStake(existingSubmission: LeagueSubmissionSnapshot | null) {
  if (!existingSubmission) return 0
  const stake = Number(existingSubmission.payloadJson.stake ?? 0)
  return Number.isFinite(stake) ? Math.max(0, Math.round(stake)) : 0
}

function getStandingStreak(member: LeagueMemberSnapshot) {
  return member.standing?.streak ?? 0
}

export const predictionMarketAdapter: LeagueAdapter = {
  kind: LeagueKind.PREDICTION_MARKET,
  defaultCadence: LeagueCadence.ONE_OFF,
  defaultScoringMetric: 'net_return',
  validateCreateConfig(input) {
    return parseMarketConfig(input)
  },
  createInitialCycles(config) {
    return [buildMarketCycle(config)]
  },
  createCycle({ input }) {
    return buildMarketCycle(parseMarketConfig(input))
  },
  validateSubmission({ input, cycle }) {
    const record = asObject(input)
    const option = String(record.option ?? '').trim()
    const stake = parseStake(record.stake, 0)
    const availableOptions = parseStringList(cycle.stateJson.options)
    const stakeMin = parseStake(cycle.stateJson.stakeMin, 25)
    const stakeMax = parseStake(cycle.stateJson.stakeMax, 250)

    if (!option || !availableOptions.includes(option)) {
      throw new Error('Choose one of the listed market options.')
    }

    if (stake < stakeMin || stake > stakeMax) {
      throw new Error(`Stake must be between ${stakeMin} and ${stakeMax} Sand.`)
    }

    return {
      option,
      stake,
    }
  },
  buildSubmissionEffects({ league, cycle, member, payloadJson, existingSubmission }) {
    const effects = []
    const previousStake = getExistingStake(existingSubmission)
    if (previousStake > 0) {
      effects.push({
        type: 'sand' as const,
        userId: member.userId,
        amount: previousStake,
        reason: 'league_bet_refund',
        description: `Refund for updating ${league.name} - ${cycle.label}`,
        toolId: league.toolId,
      })
    }

    effects.push({
      type: 'sand' as const,
      userId: member.userId,
      amount: -parseStake(payloadJson.stake, 0),
      reason: 'league_bet',
      description: `Bet placed in ${league.name} - ${cycle.label}`,
      toolId: league.toolId,
    })

    return effects
  },
  resolveCycle({ league, cycle, members, submissions, resolutionInput }) {
    const record = asObject(resolutionInput)
    const winningOption = String(record.winningOption ?? '').trim()
    const options = parseStringList(cycle.stateJson.options)

    if (!winningOption || !options.includes(winningOption)) {
      throw new Error('Resolution must name one of the market options.')
    }

    const totalPot = submissions.reduce((sum, submission) => sum + parseStake(submission.payloadJson.stake, 0), 0)
    const winningStake = submissions
      .filter((submission) => String(submission.payloadJson.option) === winningOption)
      .reduce((sum, submission) => sum + parseStake(submission.payloadJson.stake, 0), 0)

    const submissionUpdates: ResolveCycleResult['submissionUpdates'] = []
    const standingUpdates: ResolveCycleResult['standingUpdates'] = []
    const sideEffects: ResolveCycleResult['sideEffects'] = []

    for (const submission of submissions) {
      const stake = parseStake(submission.payloadJson.stake, 0)
      const pickedOption = String(submission.payloadJson.option)
      const won = pickedOption === winningOption
      const payout = won && winningStake > 0 ? Math.floor((totalPot * stake) / winningStake) : 0
      const scoreDelta = payout - stake
      const member = members.find((candidate) => candidate.id === submission.memberId)
      const nextStreak = won ? getStandingStreak(member!) + 1 : 0

      submissionUpdates.push({
        memberId: submission.memberId,
        status: 'RESOLVED',
        scoreDelta,
        payloadJson: {
          ...submission.payloadJson,
          winningOption,
          payout,
          outcome: won ? 'WIN' : 'LOSS',
        },
      })

      standingUpdates.push({
        memberId: submission.memberId,
        scoreDelta,
        winsDelta: won ? 1 : 0,
        lossesDelta: won ? 0 : 1,
        streak: nextStreak,
        metadataJson: {
          lastPick: pickedOption,
          lastOutcome: won ? 'WIN' : 'LOSS',
          payout,
        },
      })

      if (payout > 0) {
        sideEffects?.push({
          type: 'sand',
          userId: submission.userId,
          amount: payout,
          reason: 'league_payout',
          description: `Payout from ${league.name} - ${cycle.label}`,
          toolId: league.toolId,
        })
      }
    }

    return {
      summaryJson: {
        winningOption,
        totalPot,
        winningStake,
        resolvedAt: new Date().toISOString(),
      },
      submissionUpdates,
      standingUpdates,
      sideEffects,
      events: [
        {
          type: 'cycle_resolved',
          message: `"${cycle.label}" resolved to ${winningOption}.`,
          payloadJson: {
            winningOption,
            totalPot,
          },
        },
      ],
    }
  },
  rankStandings(standings) {
    return [...standings]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.wins !== a.wins) return b.wins - a.wins
        return a.name.localeCompare(b.name)
      })
      .map((standing) => standing.memberId)
  },
  buildDigest({ league, currentCycle, currentStanding, topStandings }) {
    const place =
      currentStanding?.rank != null ? `You're currently #${currentStanding.rank} in ${league.name}.` : `You're in ${league.name}.`

    const currentQuestion = currentCycle
      ? `This week's market: ${String(currentCycle.stateJson.question ?? currentCycle.label)}`
      : 'No active market is open right now.'

    const leader = topStandings[0]

    return {
      subject: `Prediction Market Monday: ${league.name}`,
      preheader: currentQuestion,
      intro: `${place} ${currentQuestion}`,
      highlight: leader
        ? `${leader.name} leads the board with ${leader.score.toFixed(0)} net Sand.`
        : 'Be the first to place a market prediction.',
    }
  },
}
