import { PlatformQuestType, QuestCadence } from '../generated/prisma'
import { prisma } from './prisma'

export function getPeriodStart(cadence: QuestCadence): Date {
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  if (cadence === 'DAILY') return periodStart

  const dayOfWeek = periodStart.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7
  periodStart.setUTCDate(periodStart.getUTCDate() - daysSinceMonday)
  return periodStart
}

type AwardQuestOptions = {
  increment?: number
  score?: number | null
}

export async function awardQuestProgress(
  userId: string,
  type: PlatformQuestType,
  options: AwardQuestOptions = {}
) {
  const quests = await prisma.platformQuest.findMany({
    where: {
      isActive: true,
      condition: type,
    },
  })

  for (const quest of quests) {
    const periodStart = getPeriodStart(quest.cadence)

    if (type === 'SCORE_ABOVE_THRESHOLD') {
      if (options.score === null || options.score === undefined || options.score < quest.targetValue) {
        continue
      }
    }

    if (type === 'HIGH_SCORE_N_TOOLS') {
      if (options.score === null || options.score === undefined || options.score < 90) {
        continue
      }

      const qualifyingTools = await prisma.leaderboardEntry.findMany({
        where: {
          userId,
          achievedAt: { gte: periodStart },
          score: { gte: 90 },
        },
        distinct: ['toolId'],
        select: { toolId: true },
      })

      const progress = Math.min(quest.targetValue, qualifyingTools.length)
      const existing = await prisma.userPlatformQuest.findUnique({
        where: {
          userId_questId_periodStart: {
            userId,
            questId: quest.id,
            periodStart,
          },
        },
      })

      await prisma.userPlatformQuest.upsert({
        where: {
          userId_questId_periodStart: {
            userId,
            questId: quest.id,
            periodStart,
          },
        },
        create: {
          userId,
          questId: quest.id,
          periodStart,
          progress,
          completedAt: progress >= quest.targetValue ? new Date() : null,
        },
        update: {
          progress,
          completedAt:
            progress >= quest.targetValue
              ? existing?.completedAt ?? new Date()
              : null,
        },
      })

      continue
    }

    const increment = options.increment ?? 1
    const existing = await prisma.userPlatformQuest.findUnique({
      where: {
        userId_questId_periodStart: {
          userId,
          questId: quest.id,
          periodStart,
        },
      },
    })

    const progress = Math.min(quest.targetValue, (existing?.progress ?? 0) + increment)
    const completedAt =
      progress >= quest.targetValue ? existing?.completedAt ?? new Date() : existing?.completedAt ?? null

    await prisma.userPlatformQuest.upsert({
      where: {
        userId_questId_periodStart: {
          userId,
          questId: quest.id,
          periodStart,
        },
      },
      create: {
        userId,
        questId: quest.id,
        periodStart,
        progress,
        completedAt,
      },
      update: {
        progress,
        completedAt,
      },
    })
  }
}

export async function claimPlatformQuestReward(userId: string, questId: string) {
  const quest = await prisma.platformQuest.findUnique({ where: { id: questId } })
  if (!quest) {
    throw new Error('Quest not found')
  }

  const periodStart = getPeriodStart(quest.cadence)
  const progress = await prisma.userPlatformQuest.findUnique({
    where: {
      userId_questId_periodStart: {
        userId,
        questId,
        periodStart,
      },
    },
  })

  if (!progress?.completedAt) {
    throw new Error('Quest is not complete yet')
  }

  if (progress.rewardClaimed) {
    throw new Error('Quest reward already claimed')
  }

  await prisma.$transaction([
    prisma.userPlatformQuest.update({
      where: {
        userId_questId_periodStart: {
          userId,
          questId,
          periodStart,
        },
      },
      data: { rewardClaimed: true },
    }),
    prisma.xPEvent.create({
      data: {
        userId,
        amount: quest.xpReward,
        reason: 'platform_quest_reward',
        metadata: quest.title,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: quest.xpReward },
      },
    }),
    prisma.sandTransaction.create({
      data: {
        userId,
        amount: quest.sandReward,
        reason: 'platform_quest_reward',
        description: quest.title,
      },
    }),
  ])

  return {
    xpReward: quest.xpReward,
    sandReward: quest.sandReward,
  }
}
