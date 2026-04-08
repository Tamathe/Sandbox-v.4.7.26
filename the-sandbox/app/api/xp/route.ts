import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { getLevelInfo } from '../../lib/xp'
import { calculateSandBalance, calculateSandBreakdown } from '../../lib/sand'

// GET /api/xp?email=... — return stats for a user
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userBadges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
      userQuests: { include: { quest: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const levelInfo = getLevelInfo(user.totalXP)
  const [publishedTools, claimedBounties, fulfilledBounties, sandTotals, sandTransactions] = await Promise.all([
    prisma.tool.count({ where: { creatorId: user.id, published: true } }),
    prisma.bounty.count({ where: { claimedById: user.id } }),
    prisma.bounty.count({ where: { claimedById: user.id, status: 'FULFILLED' } }),
    prisma.sandTransaction.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    prisma.sandTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        bounty: { select: { id: true, title: true } },
      },
    }),
  ])
  const sandInputs = {
    totalXP: user.totalXP,
    publishedTools,
    claimedBounties,
    fulfilledBounties,
    badgeCount: user.userBadges.length,
  }
  const baseSandBalance = calculateSandBalance(sandInputs)
  const transactionDelta = sandTotals._sum.amount ?? 0
  const sandBalance = Math.max(0, baseSandBalance + transactionDelta)

  return NextResponse.json({
    totalXP: user.totalXP,
    level: levelInfo.level,
    levelName: levelInfo.name,
    progress: levelInfo.progress,
    nextLevelXP: levelInfo.nextLevelXP,
    sandBalance,
    sandBreakdown: calculateSandBreakdown(sandInputs),
    sandTransactionDelta: transactionDelta,
    sandTransactions: sandTransactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      reason: transaction.reason,
      description: transaction.description,
      createdAt: transaction.createdAt,
      bounty: transaction.bounty,
    })),
    badges: user.userBadges.map(ub => ({
      slug: ub.badge.slug,
      name: ub.badge.name,
      icon: ub.badge.icon,
      description: ub.badge.description,
      earnedAt: ub.earnedAt,
    })),
    quests: user.userQuests.map(uq => ({
      id: uq.questId,
      title: uq.quest.title,
      description: uq.quest.description,
      xpReward: uq.quest.xpReward,
      progress: uq.progress,
      completedAt: uq.completedAt,
    })),
  })
}

// POST /api/xp — award XP to a user
export async function POST(req: NextRequest) {
  try {
    const { email, amount, reason, toolId } = await req.json()
    if (!email || !amount || !reason) {
      return NextResponse.json({ error: 'email, amount, reason required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await prisma.xPEvent.create({
      data: { userId: user.id, amount, reason, toolId: toolId ?? null },
    })

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { totalXP: { increment: amount } },
    })

    // Check for newly earned badges
    const newBadges = await checkAndAwardBadges(user.id, updated.totalXP)

    const [publishedTools, claimedBounties, fulfilledBounties, badgeCount, sandTotals] = await Promise.all([
      prisma.tool.count({ where: { creatorId: user.id, published: true } }),
      prisma.bounty.count({ where: { claimedById: user.id } }),
      prisma.bounty.count({ where: { claimedById: user.id, status: 'FULFILLED' } }),
      prisma.userBadge.count({ where: { userId: user.id } }),
      prisma.sandTransaction.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      }),
    ])

    const baseSandBalance = calculateSandBalance({
      totalXP: updated.totalXP,
      publishedTools,
      claimedBounties,
      fulfilledBounties,
      badgeCount,
    })

    return NextResponse.json({
      totalXP: updated.totalXP,
      ...getLevelInfo(updated.totalXP),
      sandBalance: Math.max(0, baseSandBalance + (sandTotals._sum.amount ?? 0)),
      newBadges,
    })
  } catch (err) {
    console.error('POST /api/xp error:', err)
    return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 })
  }
}

async function checkAndAwardBadges(userId: string, totalXP: number) {
  const earned: string[] = []

  // Level-based badges
  const levelBadgeMap: Record<number, string> = { 3: 'level_3', 5: 'level_5' }
  const level = getLevelInfo(totalXP).level
  const levelBadgeSlug = levelBadgeMap[level]
  if (levelBadgeSlug) {
    await maybeAwardBadge(userId, levelBadgeSlug, earned)
  }

  // XP-based: sessions count
  const sessionCount = await prisma.xPEvent.count({
    where: { userId, reason: 'session_complete' },
  })
  if (sessionCount >= 1) await maybeAwardBadge(userId, 'first_session', earned)
  if (sessionCount >= 5) await maybeAwardBadge(userId, 'sessions_5', earned)
  if (sessionCount >= 15) await maybeAwardBadge(userId, 'sessions_15', earned)

  // Message count
  const msgTotal = await prisma.xPEvent.aggregate({
    where: { userId, reason: 'messages_sent' },
    _sum: { amount: true },
  })
  const msgs = (msgTotal._sum.amount ?? 0)
  if (msgs >= 10) await maybeAwardBadge(userId, 'chat_10', earned)
  if (msgs >= 50) await maybeAwardBadge(userId, 'chat_50', earned)

  // Tool count (unique toolIds from session events)
  const toolEvents = await prisma.xPEvent.findMany({
    where: { userId, reason: 'session_complete', toolId: { not: null } },
    distinct: ['toolId'],
  })
  if (toolEvents.length >= 5) await maybeAwardBadge(userId, 'tools_5', earned)
  if (toolEvents.length >= 10) await maybeAwardBadge(userId, 'tools_10', earned)

  return earned
}

async function maybeAwardBadge(userId: string, slug: string, earned: string[]) {
  const badge = await prisma.badge.findUnique({ where: { slug } })
  if (!badge) return
  try {
    await prisma.userBadge.create({ data: { userId, badgeId: badge.id } })
    // Award XP reward for the badge itself
    if (badge.xpReward > 0) {
      await prisma.xPEvent.create({ data: { userId, amount: badge.xpReward, reason: 'badge_earned' } })
      await prisma.user.update({ where: { id: userId }, data: { totalXP: { increment: badge.xpReward } } })
    }
    earned.push(badge.name)
  } catch {
    // Already earned — unique constraint fires, just ignore
  }
}
