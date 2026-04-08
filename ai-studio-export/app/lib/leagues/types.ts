import { LeagueCadence, LeagueCycleStatus, LeagueKind } from '../../generated/prisma'

export type JsonObject = Record<string, unknown>

export type LeagueKindValue = (typeof LeagueKind)[keyof typeof LeagueKind]
export type LeagueCadenceValue = (typeof LeagueCadence)[keyof typeof LeagueCadence]
export type LeagueCycleStatusValue = (typeof LeagueCycleStatus)[keyof typeof LeagueCycleStatus]

export interface LeagueSnapshot {
  id: string
  name: string
  slug: string
  description: string | null
  kind: LeagueKindValue
  cadence: LeagueCadenceValue
  timezone: string
  configJson: JsonObject
  scoringMetric: string
  toolId: string | null
}

export interface LeagueStandingSnapshot {
  id: string
  memberId: string
  userId: string
  name: string
  email: string
  score: number
  rank: number | null
  wins: number
  losses: number
  streak: number
  lastDelta: number
  metadataJson: JsonObject | null
}

export interface LeagueMemberSnapshot {
  id: string
  userId: string
  name: string
  email: string
  role: string
  status: string
  statsJson: JsonObject | null
  standing: LeagueStandingSnapshot | null
}

export interface LeagueCycleSnapshot {
  id: string
  cycleNumber: number
  label: string
  status: LeagueCycleStatusValue
  opensAt: Date
  locksAt: Date | null
  closesAt: Date
  resolvedAt: Date | null
  stateJson: JsonObject
  summaryJson: JsonObject | null
}

export interface LeagueSubmissionSnapshot {
  id: string
  memberId: string
  userId: string
  name: string
  email: string
  status: string
  payloadJson: JsonObject
  scoreDelta: number
  submittedAt: Date
  resolvedAt: Date | null
}

export interface InitialCycleSeed {
  label: string
  opensAt: Date
  locksAt?: Date | null
  closesAt: Date
  stateJson: JsonObject
}

export interface LeagueEventSeed {
  type: string
  message: string
  payloadJson?: JsonObject | null
}

export type LeagueSideEffect =
  | {
      type: 'sand'
      userId: string
      amount: number
      reason: string
      description: string
      toolId?: string | null
    }

export interface ResolveCycleResult {
  summaryJson?: JsonObject | null
  submissionUpdates: Array<{
    memberId: string
    status?: string
    scoreDelta: number
    payloadJson?: JsonObject
    tiebreaker?: number | null
  }>
  standingUpdates: Array<{
    memberId: string
    scoreDelta: number
    winsDelta?: number
    lossesDelta?: number
    streak?: number
    metadataJson?: JsonObject | null
  }>
  memberStatsUpdates?: Array<{
    memberId: string
    statsJson: JsonObject | null
  }>
  sideEffects?: LeagueSideEffect[]
  events?: LeagueEventSeed[]
}

export interface LeagueDigest {
  subject: string
  preheader: string
  intro: string
  actionLabel?: string
  actionUrl?: string
  highlight?: string
}

export interface LeagueAdapter {
  kind: LeagueKindValue
  defaultCadence: LeagueCadenceValue
  defaultScoringMetric: string
  validateCreateConfig(input: unknown): JsonObject
  createInitialCycles(config: JsonObject): InitialCycleSeed[]
  createCycle?(args: {
    input: unknown
    league: LeagueSnapshot
    members: LeagueMemberSnapshot[]
    previousCycle: LeagueCycleSnapshot | null
    cycleNumber: number
    now: Date
  }): InitialCycleSeed
  buildNextCycle?(args: {
    league: LeagueSnapshot
    members: LeagueMemberSnapshot[]
    previousCycle: LeagueCycleSnapshot
    cycleNumber: number
    now: Date
  }): InitialCycleSeed | null
  validateSubmission(args: {
    input: unknown
    cycle: LeagueCycleSnapshot
    member: LeagueMemberSnapshot
    existingSubmission: LeagueSubmissionSnapshot | null
  }): JsonObject
  buildSubmissionEffects?(args: {
    league: LeagueSnapshot
    cycle: LeagueCycleSnapshot
    member: LeagueMemberSnapshot
    payloadJson: JsonObject
    existingSubmission: LeagueSubmissionSnapshot | null
  }): LeagueSideEffect[]
  resolveCycle(args: {
    league: LeagueSnapshot
    cycle: LeagueCycleSnapshot
    members: LeagueMemberSnapshot[]
    submissions: LeagueSubmissionSnapshot[]
    resolutionInput: unknown
  }): ResolveCycleResult | Promise<ResolveCycleResult>
  rankStandings?(standings: LeagueStandingSnapshot[]): string[]
  buildDigest(args: {
    league: LeagueSnapshot
    member: LeagueMemberSnapshot
    currentStanding: LeagueStandingSnapshot | null
    currentCycle: LeagueCycleSnapshot | null
    previousCycle: LeagueCycleSnapshot | null
    topStandings: LeagueStandingSnapshot[]
  }): LeagueDigest
}
