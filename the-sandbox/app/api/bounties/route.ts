import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { calculateSandBalance } from '../../lib/sand'

async function getAvailableSand(userId: string, totalXP: number, badgeCount?: number) {
  const [publishedTools, claimedBounties, fulfilledBounties, earnedBadgeCount, sandTotals] = await Promise.all([
    prisma.tool.count({ where: { creatorId: userId, published: true } }),
    prisma.bounty.count({ where: { claimedById: userId } }),
    prisma.bounty.count({ where: { claimedById: userId, status: 'FULFILLED' } }),
    badgeCount !== undefined ? Promise.resolve(badgeCount) : prisma.userBadge.count({ where: { userId } }),
    prisma.sandTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
  ])

  const baseSand = calculateSandBalance({
    totalXP,
    publishedTools,
    claimedBounties,
    fulfilledBounties,
    badgeCount: earnedBadgeCount,
  })

  return Math.max(0, baseSand + (sandTotals._sum.amount ?? 0))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category

    const bounties = await prisma.bounty.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        postedBy: { select: { id: true, name: true, department: true, role: true } },
        claimedBy: { select: { id: true, name: true, department: true } },
        _count: { select: { reviews: true } },
      },
    })

    return NextResponse.json({ bounties })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { userBadges: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Students cannot post bounties' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, category, difficulty, estimatedHours, rewardSand } = body

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'title, description, and category are required' }, { status: 400 })
    }

    const parsedReward = Number.parseInt(String(rewardSand ?? 250), 10)
    const rewardSandValue = Number.isFinite(parsedReward) ? Math.max(25, parsedReward) : 250
    const availableSand = await getAvailableSand(user.id, user.totalXP, user.userBadges.length)

    if (rewardSandValue > availableSand) {
      return NextResponse.json({
        error: `You only have ${availableSand.toLocaleString()} Sand available right now.`,
      }, { status: 400 })
    }

    const bounty = await prisma.$transaction(async (tx) => {
      const created = await tx.bounty.create({
        data: {
          title,
          description,
          category,
          difficulty: difficulty || null,
          estimatedHours: estimatedHours ? parseInt(estimatedHours) : null,
          rewardSand: rewardSandValue,
          postedById: user.id,
        },
      })

      await tx.sandTransaction.create({
        data: {
          userId: user.id,
          amount: -rewardSandValue,
          reason: 'bounty_escrow',
          description: `Reserved ${rewardSandValue} Sand for bounty "${title}"`,
          bountyId: created.id,
        },
      })

      return tx.bounty.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          postedBy: { select: { id: true, name: true, department: true, role: true } },
          claimedBy: { select: { id: true, name: true, department: true } },
          _count: { select: { reviews: true } },
        },
      })
    })

    return NextResponse.json({ bounty }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create bounty' }, { status: 500 })
  }
}
