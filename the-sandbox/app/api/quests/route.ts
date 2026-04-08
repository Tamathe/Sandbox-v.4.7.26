import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { getPeriodStart } from '../../lib/platform-quests'

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get('x-demo-user-email')
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const quests = await prisma.platformQuest.findMany({
      where: { isActive: true },
      orderBy: [{ cadence: 'asc' }, { createdAt: 'asc' }],
    })

    const grouped = { daily: [] as unknown[], weekly: [] as unknown[] }

    for (const quest of quests) {
      const periodStart = getPeriodStart(quest.cadence)
      const progress = await prisma.userPlatformQuest.findUnique({
        where: {
          userId_questId_periodStart: {
            userId: user.id,
            questId: quest.id,
            periodStart,
          },
        },
      })

      const item = {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        xpReward: quest.xpReward,
        sandReward: quest.sandReward,
        progress: progress?.progress ?? 0,
        targetValue: quest.targetValue,
        completedAt: progress?.completedAt ?? null,
        rewardClaimed: progress?.rewardClaimed ?? false,
      }

      if (quest.cadence === 'DAILY') {
        grouped.daily.push(item)
      } else {
        grouped.weekly.push(item)
      }
    }

    return NextResponse.json(grouped)
  } catch (error) {
    console.error('GET /api/quests error:', error)
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 })
  }
}
