import { Prisma } from '../../generated/prisma'
import { calculateSandBalance } from '../sand'
import { prisma } from '../prisma'

import { LeagueHttpError } from './auth'
import type { LeagueSideEffect } from './types'

type LeagueDbClient = typeof prisma | Prisma.TransactionClient

export async function getUserSandBalance(userId: string, db: LeagueDbClient = prisma) {
  const [user, publishedTools, claimedBounties, fulfilledBounties, badgeCount, sandTotals] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { totalXP: true },
      }),
      db.tool.count({ where: { creatorId: userId, published: true } }),
      db.bounty.count({ where: { claimedById: userId } }),
      db.bounty.count({ where: { claimedById: userId, status: 'FULFILLED' } }),
      db.userBadge.count({ where: { userId } }),
      db.sandTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ])

  if (!user) {
    throw new LeagueHttpError(404, 'User not found')
  }

  const baseBalance = calculateSandBalance({
    totalXP: user.totalXP,
    publishedTools,
    claimedBounties,
    fulfilledBounties,
    badgeCount,
  })

  return Math.max(0, baseBalance + (sandTotals._sum.amount ?? 0))
}

export async function applySandSideEffects(
  effects: LeagueSideEffect[],
  db: LeagueDbClient = prisma
) {
  const sandEffects = effects.filter(
    (effect): effect is Extract<LeagueSideEffect, { type: 'sand' }> => effect.type === 'sand'
  )

  if (sandEffects.length === 0) return

  const balanceCache = new Map<string, number>()

  for (const effect of sandEffects) {
    const currentBalance = balanceCache.has(effect.userId)
      ? balanceCache.get(effect.userId)!
      : await getUserSandBalance(effect.userId, db)

    const nextBalance = currentBalance + effect.amount
    if (nextBalance < 0) {
      throw new LeagueHttpError(400, 'Not enough Sand to complete this action')
    }

    await db.sandTransaction.create({
      data: {
        userId: effect.userId,
        amount: effect.amount,
        reason: effect.reason,
        description: effect.description,
        toolId: effect.toolId ?? null,
      },
    })

    balanceCache.set(effect.userId, nextBalance)
  }
}
