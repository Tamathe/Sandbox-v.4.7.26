export type SupportedLeagueKind = 'PREDICTION_MARKET' | 'SURVIVOR_POOL' | 'COFFEE_ROULETTE'

export interface LeagueSummary {
  id: string
  slug: string
  name: string
  description: string | null
  kind: SupportedLeagueKind
  status: string
  cadence: string
  joinCode: string | null
  memberCount: number
  creator: { id: string; name: string; email: string }
  currentCycle: {
    id: string
    label: string
    status: string
    closesAt: string
  } | null
  myMembership: {
    id: string
    role: string
  } | null
  myStanding: {
    rank: number | null
    score: number
    wins: number
    losses: number
  } | null
  createdAt: string
  updatedAt: string
}

export interface LeagueMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
  status: string
  statsJson: Record<string, unknown> | null
  standing: LeagueStanding | null
}

export interface LeagueSubmission {
  id: string
  memberId: string
  userId: string
  name: string
  email: string
  status: string
  payloadJson: Record<string, unknown>
  scoreDelta: number
  submittedAt: string
  resolvedAt: string | null
}

export interface LeagueCycle {
  id: string
  cycleNumber: number
  label: string
  status: string
  opensAt: string
  locksAt: string | null
  closesAt: string
  resolvedAt: string | null
  stateJson: Record<string, unknown>
  summaryJson: Record<string, unknown> | null
  submissions: LeagueSubmission[]
}

export interface LeagueStanding {
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
  metadataJson: Record<string, unknown> | null
}

export interface LeagueEvent {
  id: string
  type: string
  message: string
  payloadJson: Record<string, unknown> | null
  actorUserId: string | null
  createdAt: string
}

export interface LeagueDetail {
  id: string
  slug: string
  name: string
  description: string | null
  kind: SupportedLeagueKind
  status: string
  cadence: string
  visibility: string
  joinCode: string | null
  timezone: string
  startsAt: string | null
  endsAt: string | null
  nextDigestAt: string | null
  scoringMetric: string
  configJson: Record<string, unknown>
  creator: { id: string; name: string; email: string }
  memberCount: number
  myMembership: {
    id: string
    role: string
    status: string
    joinedAt: string
    statsJson: Record<string, unknown> | null
  } | null
  cycles: LeagueCycle[]
  standings: LeagueStanding[]
  members: LeagueMember[]
  events: LeagueEvent[]
  isSubscribedToDigest: boolean
  createdAt: string
  updatedAt: string
}

export interface LeaguePageMeta {
  kind: SupportedLeagueKind
  title: string
  subtitle: string
  accentClass: string
}
