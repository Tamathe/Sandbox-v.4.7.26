import {
  LeagueCadence,
  LeagueCycleStatus,
  LeagueMemberRole,
  LeagueStatus,
  Prisma,
} from '../../generated/prisma'
import { prisma } from '../prisma'
import { generateJoinCode, normalizeJoinCode } from '../join-code'

import { getLeagueAdapter, SUPPORTED_LEAGUE_KINDS } from './adapters'
import { assertLeagueAccess, LeagueHttpError } from './auth'
import { applySandSideEffects } from './sand-ledger'
import type {
  JsonObject,
  LeagueAdapter,
  LeagueCycleSnapshot,
  LeagueKindValue,
  LeagueSnapshot,
  LeagueStandingSnapshot,
  LeagueSubmissionSnapshot,
} from './types'

type LeagueDbClient = typeof prisma | Prisma.TransactionClient

export const leagueListInclude = {
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  members: {
    select: {
      id: true,
      userId: true,
      role: true,
    },
  },
  standings: {
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ rank: 'asc' as const }, { score: 'desc' as const }],
  },
  cycles: {
    orderBy: { cycleNumber: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.LeagueInclude

export const leagueDetailInclude = {
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  standings: {
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ rank: 'asc' as const }, { score: 'desc' as const }],
  },
  cycles: {
    include: {
      submissions: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'asc' as const },
      },
    },
    orderBy: { cycleNumber: 'desc' as const },
  },
  emailSubs: {
    orderBy: { createdAt: 'desc' as const },
  },
  events: {
    orderBy: { createdAt: 'desc' as const },
    take: 40,
  },
} satisfies Prisma.LeagueInclude

export type LeagueListRecord = Prisma.LeagueGetPayload<{ include: typeof leagueListInclude }>
export type LeagueDetailRecord = Prisma.LeagueGetPayload<{ include: typeof leagueDetailInclude }>

function asJsonObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {}
}

function asNullableJsonObject(value: unknown) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as JsonObject
  }

  return null
}

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue
}

function toNullableJsonInput(value: unknown) {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue)
}

function slugifyLeagueName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function getNextMondayMorning(baseDate = new Date()) {
  const next = new Date(baseDate)
  next.setHours(9, 0, 0, 0)
  const day = next.getDay()
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7
  next.setDate(next.getDate() + daysUntilMonday)
  return next
}

function isLeagueCadence(value: unknown): value is LeagueCadence {
  return value === LeagueCadence.ONE_OFF || value === LeagueCadence.WEEKLY || value === LeagueCadence.SEASONAL
}

function isLeagueRoleAdmin(role: string) {
  return role === LeagueMemberRole.OWNER || role === LeagueMemberRole.ADMIN
}

async function generateUniqueLeagueJoinCode(db: LeagueDbClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateJoinCode()
    const existing = await db.league.findUnique({
      where: { joinCode: candidate },
      select: { id: true },
    })

    if (!existing) return candidate
  }

  throw new LeagueHttpError(500, 'Could not generate a unique join code')
}

async function generateUniqueLeagueSlug(name: string, db: LeagueDbClient) {
  const base = slugifyLeagueName(name) || 'league'

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    const existing = await db.league.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing) return slug
  }

  throw new LeagueHttpError(500, 'Could not generate a unique league slug')
}

function toLeagueSnapshot(league: Pick<LeagueDetailRecord, 'id' | 'name' | 'slug' | 'description' | 'kind' | 'cadence' | 'timezone' | 'configJson' | 'scoringMetric' | 'toolId'>): LeagueSnapshot {
  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    description: league.description,
    kind: league.kind,
    cadence: league.cadence,
    timezone: league.timezone,
    configJson: asJsonObject(league.configJson),
    scoringMetric: league.scoringMetric,
    toolId: league.toolId,
  }
}

function toCycleSnapshot(cycle: LeagueDetailRecord['cycles'][number]): LeagueCycleSnapshot {
  return {
    id: cycle.id,
    cycleNumber: cycle.cycleNumber,
    label: cycle.label,
    status: cycle.status,
    opensAt: cycle.opensAt,
    locksAt: cycle.locksAt,
    closesAt: cycle.closesAt,
    resolvedAt: cycle.resolvedAt,
    stateJson: asJsonObject(cycle.stateJson),
    summaryJson: asNullableJsonObject(cycle.summaryJson),
  }
}

function toStandingSnapshot(standing: LeagueDetailRecord['standings'][number]): LeagueStandingSnapshot {
  return {
    id: standing.id,
    memberId: standing.memberId,
    userId: standing.member.userId,
    name: standing.member.user.name,
    email: standing.member.user.email,
    score: standing.score,
    rank: standing.rank,
    wins: standing.wins,
    losses: standing.losses,
    streak: standing.streak,
    lastDelta: standing.lastDelta,
    metadataJson: asNullableJsonObject(standing.metadataJson),
  }
}

function buildMemberSnapshots(league: LeagueDetailRecord) {
  const standingMap = new Map(
    league.standings.map((standing) => [standing.memberId, toStandingSnapshot(standing)])
  )

  return league.members.map((member) => ({
    id: member.id,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    status: member.status,
    statsJson: asNullableJsonObject(member.statsJson),
    standing: standingMap.get(member.id) ?? null,
  }))
}

function buildSubmissionSnapshots(
  cycle: LeagueDetailRecord['cycles'][number]
): LeagueSubmissionSnapshot[] {
  return cycle.submissions.map((submission) => ({
    id: submission.id,
    memberId: submission.memberId,
    userId: submission.member.userId,
    name: submission.member.user.name,
    email: submission.member.user.email,
    status: submission.status,
    payloadJson: asJsonObject(submission.payloadJson),
    scoreDelta: submission.scoreDelta,
    submittedAt: submission.submittedAt,
    resolvedAt: submission.resolvedAt,
  }))
}

export function getLeagueMembership(
  league: Pick<LeagueDetailRecord, 'members'>,
  userId: string
) {
  return league.members.find((member) => member.userId === userId) ?? null
}

export function serializeLeagueSummary(league: LeagueListRecord, userId: string) {
  const member = league.members.find((entry) => entry.userId === userId) ?? null
  const myStanding = league.standings.find((entry) => entry.member.userId === userId) ?? null
  const currentCycle = league.cycles[0] ?? null

  return {
    id: league.id,
    slug: league.slug,
    name: league.name,
    description: league.description,
    kind: league.kind,
    status: league.status,
    cadence: league.cadence,
    joinCode: member ? league.joinCode : null,
    memberCount: league.members.length,
    creator: league.creator,
    currentCycle: currentCycle
      ? {
          id: currentCycle.id,
          label: currentCycle.label,
          status: currentCycle.status,
          closesAt: currentCycle.closesAt,
        }
      : null,
    myMembership: member
      ? {
          id: member.id,
          role: member.role,
        }
      : null,
    myStanding: myStanding
      ? {
          rank: myStanding.rank,
          score: myStanding.score,
          wins: myStanding.wins,
          losses: myStanding.losses,
        }
      : null,
    createdAt: league.createdAt,
    updatedAt: league.updatedAt,
  }
}

export function serializeLeagueDetail(league: LeagueDetailRecord, userId: string) {
  const member = getLeagueMembership(league, userId)
  const memberSnapshots = buildMemberSnapshots(league)

  return {
    id: league.id,
    slug: league.slug,
    name: league.name,
    description: league.description,
    kind: league.kind,
    status: league.status,
    cadence: league.cadence,
    visibility: league.visibility,
    joinCode: member ? league.joinCode : null,
    timezone: league.timezone,
    startsAt: league.startsAt,
    endsAt: league.endsAt,
    nextDigestAt: league.nextDigestAt,
    scoringMetric: league.scoringMetric,
    configJson: asJsonObject(league.configJson),
    creator: league.creator,
    memberCount: league.members.length,
    myMembership: member
      ? {
          id: member.id,
          role: member.role,
          status: member.status,
          joinedAt: member.joinedAt,
          statsJson: member.statsJson,
        }
      : null,
    cycles: league.cycles.map((cycle) => ({
      ...toCycleSnapshot(cycle),
      submissions: buildSubmissionSnapshots(cycle),
    })),
    standings: league.standings.map(toStandingSnapshot),
    members: memberSnapshots,
    events: league.events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      payloadJson: event.payloadJson,
      actorUserId: event.actorUserId,
      createdAt: event.createdAt,
    })),
    isSubscribedToDigest: league.emailSubs.some((sub) => sub.userId === userId && sub.active),
    createdAt: league.createdAt,
    updatedAt: league.updatedAt,
  }
}

export async function listLeaguesForUser(userId: string, kind?: LeagueKindValue) {
  const leagues = await prisma.league.findMany({
    where: {
      ...(kind ? { kind } : {}),
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
    },
    include: leagueListInclude,
    orderBy: { updatedAt: 'desc' },
  })

  return leagues.map((league) => serializeLeagueSummary(league, userId))
}

export async function loadLeagueForUser(leagueId: string, userId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: leagueDetailInclude,
  })

  if (!league) {
    throw new LeagueHttpError(404, 'League not found')
  }

  const member = getLeagueMembership(league, userId)
  const canAccess = Boolean(member) || (league.visibility === 'PUBLIC' && league.status !== LeagueStatus.ARCHIVED)
  assertLeagueAccess(canAccess, 'You do not have access to this league')

  return league
}

export async function createLeague(args: {
  userId: string
  userEmail: string
  kind: LeagueKindValue
  name: string
  description?: string | null
  cadence?: LeagueCadence | null
  timezone?: string | null
  toolId?: string | null
  emailForDigest?: string | null
  configInput: unknown
}) {
  const kind = args.kind
  assertLeagueAccess(
    SUPPORTED_LEAGUE_KINDS.includes(kind as (typeof SUPPORTED_LEAGUE_KINDS)[number]),
    'This league type is not supported yet',
    400
  )

  const adapter = getLeagueAdapter(kind)
  const configJson = adapter.validateCreateConfig(args.configInput)
  const cadence =
    (isLeagueCadence(args.cadence) && args.cadence) ||
    (isLeagueCadence(configJson.cadence) ? configJson.cadence : adapter.defaultCadence)
  const initialCycles = adapter.createInitialCycles(configJson)
  const name = args.name.trim()

  if (!name) {
    throw new LeagueHttpError(400, 'League name is required')
  }

  const league = await prisma.$transaction(async (tx) => {
    const [slug, joinCode] = await Promise.all([
      generateUniqueLeagueSlug(name, tx),
      generateUniqueLeagueJoinCode(tx),
    ])

    const created = await tx.league.create({
      data: {
        slug,
        name,
        description: args.description?.trim() || null,
        kind,
        status: LeagueStatus.ACTIVE,
        joinCode,
        creatorId: args.userId,
        toolId: args.toolId ?? null,
        cadence,
        timezone: args.timezone?.trim() || 'America/New_York',
        nextDigestAt: cadence === LeagueCadence.WEEKLY ? getNextMondayMorning() : null,
        scoringMetric: adapter.defaultScoringMetric,
        configJson: toInputJson(configJson),
      },
    })

    const ownerMember = await tx.leagueMember.create({
      data: {
        leagueId: created.id,
        userId: args.userId,
        role: LeagueMemberRole.OWNER,
      },
    })
    await tx.leagueStanding.create({
      data: {
        leagueId: created.id,
        memberId: ownerMember.id,
      },
    })

    if (args.emailForDigest?.trim()) {
      await tx.leagueEmailSub.create({
        data: {
          leagueId: created.id,
          userId: args.userId,
          email: args.emailForDigest.trim(),
        },
      })
    }

    for (const cycle of initialCycles) {
      await tx.leagueCycle.create({
        data: {
          leagueId: created.id,
          cycleNumber: initialCycles.indexOf(cycle) + 1,
          label: cycle.label,
          status: LeagueCycleStatus.OPEN,
          opensAt: cycle.opensAt,
          locksAt: cycle.locksAt ?? cycle.closesAt,
          closesAt: cycle.closesAt,
          stateJson: toInputJson(cycle.stateJson),
        },
      })
    }

    await tx.leagueEvent.create({
      data: {
        leagueId: created.id,
        actorUserId: args.userId,
        type: 'league_created',
        message: `${name} was created.`,
      },
    })

    return created.id
  })

  return loadLeagueForUser(league, args.userId)
}

export async function joinLeagueByCode(args: {
  userId: string
  email: string
  joinCode: string
  emailForDigest?: string | null
}) {
  const joinCode = normalizeJoinCode(args.joinCode)
  if (!joinCode) {
    throw new LeagueHttpError(400, 'Join code is required')
  }

  const leagueId = await prisma.$transaction(async (tx) => {
    const league = await tx.league.findUnique({
      where: { joinCode },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    })

    if (!league) {
      throw new LeagueHttpError(404, 'League not found')
    }

    const existingMember = league.members.find((member) => member.userId === args.userId)
    if (existingMember) {
      return league.id
    }

    const member = await tx.leagueMember.create({
      data: {
        leagueId: league.id,
        userId: args.userId,
      },
    })

    await tx.leagueStanding.create({
      data: {
        leagueId: league.id,
        memberId: member.id,
      },
    })

    if (args.emailForDigest?.trim()) {
      await tx.leagueEmailSub.upsert({
        where: {
          leagueId_userId: {
            leagueId: league.id,
            userId: args.userId,
          },
        },
        create: {
          leagueId: league.id,
          userId: args.userId,
          email: args.emailForDigest.trim(),
        },
        update: {
          email: args.emailForDigest.trim(),
          active: true,
        },
      })
    }

    await tx.leagueEvent.create({
      data: {
        leagueId: league.id,
        actorUserId: args.userId,
        type: 'member_joined',
        message: `${args.email} joined the league.`,
      },
    })

    return league.id
  })

  return loadLeagueForUser(leagueId, args.userId)
}

export async function setLeagueDigestSubscription(args: {
  leagueId: string
  userId: string
  email?: string | null
  active: boolean
}) {
  const league = await prisma.league.findUnique({
    where: { id: args.leagueId },
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  })

  if (!league) {
    throw new LeagueHttpError(404, 'League not found')
  }

  assertLeagueAccess(
    league.members.some((member) => member.userId === args.userId),
    'You must be a league member to manage digest settings'
  )

  if (args.active) {
    const email = args.email?.trim()
    if (!email) {
      throw new LeagueHttpError(400, 'Email is required to subscribe')
    }

    await prisma.leagueEmailSub.upsert({
      where: {
        leagueId_userId: {
          leagueId: args.leagueId,
          userId: args.userId,
        },
      },
      create: {
        leagueId: args.leagueId,
        userId: args.userId,
        email,
      },
      update: {
        email,
        active: true,
      },
    })
  } else {
    await prisma.leagueEmailSub.updateMany({
      where: {
        leagueId: args.leagueId,
        userId: args.userId,
      },
      data: {
        active: false,
      },
    })
  }
}

export async function patchLeagueStatus(args: {
  leagueId: string
  userId: string
  action: 'archive' | 'pause' | 'activate'
}) {
  const league = await loadLeagueForUser(args.leagueId, args.userId)
  const member = getLeagueMembership(league, args.userId)
  assertLeagueAccess(member && isLeagueRoleAdmin(member.role), 'Only league admins can update this league')

  const nextStatus =
    args.action === 'archive'
      ? LeagueStatus.ARCHIVED
      : args.action === 'pause'
        ? LeagueStatus.PAUSED
        : LeagueStatus.ACTIVE

  await prisma.league.update({
    where: { id: league.id },
    data: { status: nextStatus },
  })

  await prisma.leagueEvent.create({
    data: {
      leagueId: league.id,
      actorUserId: args.userId,
      type: 'league_status_changed',
      message: `${league.name} is now ${nextStatus.toLowerCase()}.`,
      payloadJson: toInputJson({
        status: nextStatus,
      }),
    },
  })

  return loadLeagueForUser(league.id, args.userId)
}

async function recomputeLeagueRanks(
  leagueId: string,
  adapter: LeagueAdapter,
  db: LeagueDbClient = prisma
) {
  const standings = await db.leagueStanding.findMany({
    where: { leagueId },
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  const snapshots: LeagueStandingSnapshot[] = standings.map((standing) => ({
    id: standing.id,
    memberId: standing.memberId,
    userId: standing.member.userId,
    name: standing.member.user.name,
    email: standing.member.user.email,
    score: standing.score,
    rank: standing.rank,
    wins: standing.wins,
    losses: standing.losses,
    streak: standing.streak,
    lastDelta: standing.lastDelta,
    metadataJson: asNullableJsonObject(standing.metadataJson),
  }))

  const orderedMemberIds =
    adapter.rankStandings?.(snapshots) ??
    [...snapshots]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.name.localeCompare(b.name)
      })
      .map((standing) => standing.memberId)

  await Promise.all(
    orderedMemberIds.map((memberId, index) =>
      db.leagueStanding.updateMany({
        where: {
          leagueId,
          memberId,
        },
        data: {
          rank: index + 1,
        },
      })
    )
  )
}

function getCycleForSubmission(league: LeagueDetailRecord, cycleId: string) {
  const cycle = league.cycles.find((entry) => entry.id === cycleId)
  if (!cycle) {
    throw new LeagueHttpError(404, 'Cycle not found')
  }

  return cycle
}

export async function createLeagueCycle(args: {
  leagueId: string
  userId: string
  input: unknown
}) {
  const league = await loadLeagueForUser(args.leagueId, args.userId)
  const member = getLeagueMembership(league, args.userId)
  assertLeagueAccess(member && isLeagueRoleAdmin(member.role), 'Only league admins can add cycles')
  assertLeagueAccess(
    !league.cycles.some(
      (cycle) => cycle.status === LeagueCycleStatus.OPEN || cycle.status === LeagueCycleStatus.LOCKED
    ),
    'Resolve or close the current cycle before opening the next one',
    400
  )

  const adapter = getLeagueAdapter(league.kind)
  assertLeagueAccess(Boolean(adapter.createCycle), 'This league type does not support manual cycle creation', 400)

  const leagueSnapshot = toLeagueSnapshot(league)
  const memberSnapshots = buildMemberSnapshots(league)
  const previousCycle = league.cycles[0] ? toCycleSnapshot(league.cycles[0]) : null
  const cycleNumber = (league.cycles[0]?.cycleNumber ?? 0) + 1
  const seed = adapter.createCycle!({
    input: args.input,
    league: leagueSnapshot,
    members: memberSnapshots,
    previousCycle,
    cycleNumber,
    now: new Date(),
  })

  await prisma.$transaction(async (tx) => {
    await tx.leagueCycle.create({
      data: {
        leagueId: league.id,
        cycleNumber,
        label: seed.label,
        status: LeagueCycleStatus.OPEN,
        opensAt: seed.opensAt,
        locksAt: seed.locksAt ?? seed.closesAt,
        closesAt: seed.closesAt,
        stateJson: toInputJson(seed.stateJson),
      },
    })

    await tx.leagueEvent.create({
      data: {
        leagueId: league.id,
        actorUserId: args.userId,
        type: 'cycle_created',
        message: `${seed.label} opened.`,
      },
    })
  })

  return loadLeagueForUser(league.id, args.userId)
}

export async function submitLeagueCycle(args: {
  leagueId: string
  cycleId: string
  userId: string
  input: unknown
}) {
  const league = await loadLeagueForUser(args.leagueId, args.userId)
  const member = getLeagueMembership(league, args.userId)
  assertLeagueAccess(member, 'You must join the league before submitting')

  const cycle = getCycleForSubmission(league, args.cycleId)
  const cycleSnapshot = toCycleSnapshot(cycle)
  const now = new Date()

  assertLeagueAccess(cycle.status === LeagueCycleStatus.OPEN, 'This cycle is not open for submissions', 400)
  assertLeagueAccess(now <= cycle.closesAt, 'This cycle is already closed', 400)
  if (cycle.locksAt) {
    assertLeagueAccess(now <= cycle.locksAt, 'This cycle is locked', 400)
  }

  const adapter = getLeagueAdapter(league.kind)
  const memberSnapshots = buildMemberSnapshots(league)
  const memberSnapshot = memberSnapshots.find((entry) => entry.id === member.id)
  if (!memberSnapshot) {
    throw new LeagueHttpError(404, 'League membership not found')
  }

  const existingSubmission = cycle.submissions.find((submission) => submission.memberId === member.id) ?? null
  const existingSubmissionSnapshot = existingSubmission
    ? buildSubmissionSnapshots({
        ...cycle,
        submissions: [existingSubmission],
      } as LeagueDetailRecord['cycles'][number])[0]
    : null

  const payloadJson = adapter.validateSubmission({
    input: args.input,
    cycle: cycleSnapshot,
    member: memberSnapshot,
    existingSubmission: existingSubmissionSnapshot,
  })

  const sideEffects = adapter.buildSubmissionEffects?.({
    league: toLeagueSnapshot(league),
    cycle: cycleSnapshot,
    member: memberSnapshot,
    payloadJson,
    existingSubmission: existingSubmissionSnapshot,
  }) ?? []

  await prisma.$transaction(async (tx) => {
    await applySandSideEffects(sideEffects, tx)

    if (existingSubmission) {
      await tx.leagueSubmission.update({
        where: {
          cycleId_memberId: {
            cycleId: cycle.id,
            memberId: member.id,
          },
        },
        data: {
          payloadJson: toInputJson(payloadJson),
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      })
    } else {
      await tx.leagueSubmission.create({
        data: {
          leagueId: league.id,
          cycleId: cycle.id,
          memberId: member.id,
          payloadJson: toInputJson(payloadJson),
        },
      })
    }

    await tx.leagueMember.update({
      where: { id: member.id },
      data: {
        lastActiveAt: new Date(),
      },
    })

    await tx.leagueEvent.create({
      data: {
        leagueId: league.id,
        cycleId: cycle.id,
        actorUserId: args.userId,
        type: existingSubmission ? 'submission_updated' : 'submission_created',
        message: `${memberSnapshot.name} submitted for ${cycle.label}.`,
      },
    })
  })

  return loadLeagueForUser(league.id, args.userId)
}

export async function resolveLeagueCycle(args: {
  leagueId: string
  cycleId: string
  userId: string
  resolutionInput: unknown
}) {
  const league = await loadLeagueForUser(args.leagueId, args.userId)
  const member = getLeagueMembership(league, args.userId)
  assertLeagueAccess(member && isLeagueRoleAdmin(member.role), 'Only league admins can resolve cycles')

  const cycle = getCycleForSubmission(league, args.cycleId)
  assertLeagueAccess(cycle.status !== LeagueCycleStatus.RESOLVED, 'This cycle is already resolved', 400)
  const adapter = getLeagueAdapter(league.kind)
  const memberSnapshots = buildMemberSnapshots(league)
  const result = await adapter.resolveCycle({
    league: toLeagueSnapshot(league),
    cycle: toCycleSnapshot(cycle),
    members: memberSnapshots,
    submissions: buildSubmissionSnapshots(cycle),
    resolutionInput: args.resolutionInput,
  })

  await prisma.$transaction(async (tx) => {
    await applySandSideEffects(result.sideEffects ?? [], tx)

    for (const submissionUpdate of result.submissionUpdates) {
      await tx.leagueSubmission.updateMany({
        where: {
          cycleId: cycle.id,
          memberId: submissionUpdate.memberId,
        },
        data: {
          status: submissionUpdate.status,
          scoreDelta: submissionUpdate.scoreDelta,
          payloadJson:
            submissionUpdate.payloadJson === undefined
              ? undefined
              : toInputJson(submissionUpdate.payloadJson),
          tiebreaker: submissionUpdate.tiebreaker ?? null,
          resolvedAt: new Date(),
        },
      })
    }

    for (const standingUpdate of result.standingUpdates) {
      const existingStanding = league.standings.find((standing) => standing.memberId === standingUpdate.memberId)
      await tx.leagueStanding.updateMany({
        where: {
          leagueId: league.id,
          memberId: standingUpdate.memberId,
        },
        data: {
          score: { increment: standingUpdate.scoreDelta },
          wins: { increment: standingUpdate.winsDelta ?? 0 },
          losses: { increment: standingUpdate.lossesDelta ?? 0 },
          streak: standingUpdate.streak ?? existingStanding?.streak ?? 0,
          lastDelta: standingUpdate.scoreDelta,
          metadataJson:
            standingUpdate.metadataJson === undefined
              ? toNullableJsonInput(existingStanding?.metadataJson ?? null)
              : toNullableJsonInput(standingUpdate.metadataJson),
        },
      })
    }

    for (const memberStatsUpdate of result.memberStatsUpdates ?? []) {
      await tx.leagueMember.update({
        where: { id: memberStatsUpdate.memberId },
        data: {
          statsJson: toNullableJsonInput(memberStatsUpdate.statsJson ?? null),
          lastActiveAt: new Date(),
        },
      })
    }

    await tx.leagueCycle.update({
      where: { id: cycle.id },
      data: {
        status: LeagueCycleStatus.RESOLVED,
        resolvedAt: new Date(),
        summaryJson: toNullableJsonInput(result.summaryJson ?? null),
      },
    })

    for (const event of result.events ?? []) {
      await tx.leagueEvent.create({
        data: {
          leagueId: league.id,
          cycleId: cycle.id,
          actorUserId: args.userId,
          type: event.type,
          message: event.message,
          payloadJson:
            event.payloadJson === undefined ? undefined : toInputJson(event.payloadJson),
        },
      })
    }

    await tx.league.update({
      where: { id: league.id },
      data: {
        updatedAt: new Date(),
        nextDigestAt:
          league.cadence === LeagueCadence.WEEKLY
            ? getNextMondayMorning()
            : league.nextDigestAt,
      },
    })

    await recomputeLeagueRanks(league.id, adapter, tx)
  })

  return loadLeagueForUser(league.id, args.userId)
}

export async function maybeCreateNextCycleForWeeklyLeague(leagueId: string, db: LeagueDbClient = prisma) {
  const league = await db.league.findUnique({
    where: { id: leagueId },
    include: leagueDetailInclude,
  })

  if (!league || league.cadence !== LeagueCadence.WEEKLY || league.status !== LeagueStatus.ACTIVE) {
    return null
  }

  const adapter = getLeagueAdapter(league.kind)
  if (!adapter.buildNextCycle) return null

  const openCycle = league.cycles.find(
    (cycle) => cycle.status === LeagueCycleStatus.OPEN || cycle.status === LeagueCycleStatus.LOCKED
  )
  if (openCycle) return null

  const previousCycle = league.cycles[0]
  if (!previousCycle || previousCycle.status !== LeagueCycleStatus.RESOLVED) {
    return null
  }

  const seed = adapter.buildNextCycle({
    league: toLeagueSnapshot(league),
    members: buildMemberSnapshots(league),
    previousCycle: toCycleSnapshot(previousCycle),
    cycleNumber: previousCycle.cycleNumber + 1,
    now: new Date(),
  })

  if (!seed) return null

  await db.leagueCycle.create({
    data: {
      leagueId: league.id,
      cycleNumber: previousCycle.cycleNumber + 1,
      label: seed.label,
      status: LeagueCycleStatus.OPEN,
      opensAt: seed.opensAt,
      locksAt: seed.locksAt ?? seed.closesAt,
      closesAt: seed.closesAt,
      stateJson: toInputJson(seed.stateJson),
    },
  })

  await db.leagueEvent.create({
    data: {
      leagueId: league.id,
      type: 'cycle_created',
      message: `${seed.label} opened automatically.`,
    },
  })

  return league.id
}
