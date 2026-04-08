import { prisma } from '../prisma'
import { recalculateAllEntries } from './scoring-service'
import { generateResultCommentary } from './host-service'
import type {
  BracketContest,
  BracketEntry,
  BracketMessage,
  BracketNotifyFreq,
  BracketNudgeLevel,
} from '../../generated/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string
  name: string
  score: number
  maxPossible: number
  isEliminated: boolean
  rank: number
  isYou: boolean
  pickCount: number
}

export interface ContestResult {
  gameId: string
  winnerId: string
  round: number
  enteredAt: Date
}

export interface ContestWithLeaderboard {
  contest: BracketContest
  leaderboard: LeaderboardEntry[]
  myEntry: BracketEntry | null
  results: ContestResult[]
  isCommissioner: boolean
}

export interface MessageWithReplies extends BracketMessage {
  user: { id: string; name: string } | null
  replies: (BracketMessage & { user: { id: string; name: string } | null })[]
}

// ─── Access code ──────────────────────────────────────────────────────────────

const ADJECTIVES = [
  'WILD', 'BOLD', 'FAST', 'BLUE', 'GOLD', 'EPIC', 'SLAM', 'DUNK',
  'HOOP', 'RUSH', 'BUZZ', 'FIRE', 'PEAK', 'APEX', 'STAR', 'RISE',
]

function generateAccessCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${adj}-${num}`
}

async function uniqueAccessCode(): Promise<string> {
  let code = generateAccessCode()
  let exists = await prisma.bracketContest.findUnique({ where: { accessCode: code } })
  while (exists) {
    code = generateAccessCode()
    exists = await prisma.bracketContest.findUnique({ where: { accessCode: code } })
  }
  return code
}

// ─── Contest CRUD ─────────────────────────────────────────────────────────────

export async function createContest(
  userId: string,
  input: {
    name: string
    notifyFrequency?: BracketNotifyFreq
    nudgeIntensity?: BracketNudgeLevel
    allowAiNudges?: boolean
  }
): Promise<BracketContest> {
  const accessCode = await uniqueAccessCode()

  const contest = await prisma.bracketContest.create({
    data: {
      name: input.name.trim(),
      accessCode,
      commissionerId: userId,
      notifyFrequency: input.notifyFrequency ?? 'AFTER_ROUND',
      nudgeIntensity: input.nudgeIntensity ?? 'GENTLE',
      allowAiNudges: input.allowAiNudges ?? true,
      // Auto-enroll creator as first player
      entries: {
        create: {
          userId,
          picks: {},
        },
      },
    },
  })

  return contest
}

export async function getUserContests(userId: string): Promise<
  (BracketContest & { _count: { entries: number } })[]
> {
  // Return contests where user is commissioner OR has an entry
  const [commissioned, joined] = await Promise.all([
    prisma.bracketContest.findMany({
      where: { commissionerId: userId },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bracketContest.findMany({
      where: {
        entries: { some: { userId } },
        commissionerId: { not: userId }, // avoid duplicates
      },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return [...commissioned, ...joined]
}

export async function getUserScoresForContests(
  userId: string,
  contestIds: string[]
): Promise<Map<string, { score: number; rank: number }>> {
  if (contestIds.length === 0) return new Map()
  const userEntries = await prisma.bracketEntry.findMany({
    where: { contestId: { in: contestIds }, userId },
    select: { contestId: true, score: true },
  })
  const result = new Map<string, { score: number; rank: number }>()
  await Promise.all(
    userEntries.map(async (entry) => {
      const higherCount = await prisma.bracketEntry.count({
        where: { contestId: entry.contestId, score: { gt: entry.score } },
      })
      result.set(entry.contestId, { score: entry.score, rank: higherCount + 1 })
    })
  )
  return result
}

export async function getPickCountsForUser(
  userId: string,
  contestIds: string[]
): Promise<Map<string, number>> {
  if (contestIds.length === 0) return new Map()
  const entries = await prisma.bracketEntry.findMany({
    where: { contestId: { in: contestIds }, userId },
    select: { contestId: true, picks: true },
  })
  return new Map(
    entries.map((e) => [
      e.contestId,
      Object.keys((e.picks as Record<string, string>) ?? {}).length,
    ])
  )
}

export async function getContest(
  contestId: string,
  requestUserId: string
): Promise<ContestWithLeaderboard> {
  const [contest, entries, results] = await Promise.all([
    prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } }),
    prisma.bracketEntry.findMany({
      where: { contestId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { score: 'desc' },
    }),
    prisma.bracketResult.findMany({
      where: { contestId },
      orderBy: { enteredAt: 'asc' },
    }),
  ])

  const leaderboard: LeaderboardEntry[] = entries.map((entry, idx) => ({
    userId: entry.userId,
    name: entry.user.name,
    score: entry.score,
    maxPossible: entry.maxPossible,
    isEliminated: entry.isEliminated,
    rank: idx + 1,
    isYou: entry.userId === requestUserId,
    pickCount: Object.keys((entry.picks as Record<string, string>) ?? {}).length,
  }))

  const myEntry = entries.find(e => e.userId === requestUserId) ?? null

  return {
    contest,
    leaderboard,
    myEntry: myEntry ? { ...myEntry } : null,
    results: results.map(r => ({
      gameId: r.gameId,
      winnerId: r.winnerId,
      round: r.round,
      enteredAt: r.enteredAt,
    })),
    isCommissioner: contest.commissionerId === requestUserId,
  }
}

// ─── Join ─────────────────────────────────────────────────────────────────────

export async function joinContest(
  accessCode: string,
  userId: string
): Promise<BracketEntry> {
  const contest = await prisma.bracketContest.findUnique({
    where: { accessCode: accessCode.toUpperCase() },
  })

  if (!contest) throw new Error('Contest not found')
  if (contest.status !== 'PICKING') throw new Error('This contest is no longer accepting new players')

  const existing = await prisma.bracketEntry.findUnique({
    where: { contestId_userId: { contestId: contest.id, userId } },
  })
  if (existing) throw new Error('You have already joined this contest')

  return prisma.bracketEntry.create({
    data: {
      contestId: contest.id,
      userId,
      picks: {},
    },
  })
}

// ─── Lock picks ───────────────────────────────────────────────────────────────

export async function lockPicks(
  contestId: string,
  commissionerId: string
): Promise<void> {
  const contest = await prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } })
  if (contest.commissionerId !== commissionerId) throw new Error('Only the commissioner can lock picks')

  await prisma.bracketContest.update({
    where: { id: contestId },
    data: { status: 'LOCKED', picksLockedAt: new Date() },
  })
}

// ─── Picks ────────────────────────────────────────────────────────────────────

export async function savePicks(
  contestId: string,
  userId: string,
  picks: Record<string, string>
): Promise<BracketEntry> {
  const contest = await prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } })
  if (contest.status !== 'PICKING') throw new Error('Picks are locked for this contest')

  return prisma.bracketEntry.upsert({
    where: { contestId_userId: { contestId, userId } },
    create: { contestId, userId, picks },
    update: { picks },
  })
}

export async function getPicks(
  contestId: string,
  userId: string
): Promise<BracketEntry | null> {
  return prisma.bracketEntry.findUnique({
    where: { contestId_userId: { contestId, userId } },
  })
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function enterResult(
  contestId: string,
  commissionerId: string,
  gameId: string,
  winnerId: string,
  round: number
): Promise<void> {
  const contest = await prisma.bracketContest.findUniqueOrThrow({ where: { id: contestId } })
  if (contest.commissionerId !== commissionerId) throw new Error('Only the commissioner can enter results')

  await prisma.bracketResult.upsert({
    where: { contestId_gameId: { contestId, gameId } },
    create: { contestId, gameId, winnerId, round, enteredById: commissionerId },
    update: { winnerId, enteredById: commissionerId },
  })

  // Transition from LOCKED → IN_PROGRESS on first result
  if (contest.status === 'LOCKED') {
    await prisma.bracketContest.update({
      where: { id: contestId },
      data: { status: 'IN_PROGRESS' },
    })
  }

  await recalculateAllEntries(contestId)

  // Fire-and-forget: per-game AI host commentary after scoring
  generateResultCommentary(contestId, gameId, winnerId, round).catch(() => {})
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function getMessages(contestId: string): Promise<MessageWithReplies[]> {
  const messages = await prisma.bracketMessage.findMany({
    where: { contestId, parentId: null },
    include: {
      user: { select: { id: true, name: true } },
      replies: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return messages as MessageWithReplies[]
}

export async function postMessage(
  contestId: string,
  userId: string | null,
  content: string,
  isAiHost = false,
  parentId?: string
): Promise<BracketMessage> {
  return prisma.bracketMessage.create({
    data: {
      contestId,
      userId: userId ?? null,
      content: content.trim(),
      isAiHost,
      parentId: parentId ?? null,
    },
  })
}
