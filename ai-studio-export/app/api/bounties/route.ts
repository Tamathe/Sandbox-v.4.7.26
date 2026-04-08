import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { calculateSandBalance } from '../../lib/sand'
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { CreateBountySchema, BountiesQuerySchema } from '../../lib/schemas'
import { BOUNTY_INCLUDE } from '../../lib/prisma-includes'

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
    const queryValidation = validateBody(BountiesQuerySchema, Object.fromEntries(searchParams.entries()))
    if ('error' in queryValidation) return queryValidation.error
    const { status, category } = queryValidation.value

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (category) where.category = category

    const bounties = await prisma.bounty.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: BOUNTY_INCLUDE,
    })

    return NextResponse.json({ bounties })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    if (user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Students cannot post bounties' }, { status: 403 })
    }

    const userWithBadges = await prisma.user.findUnique({
      where: { id: user.id },
      include: { userBadges: true },
    })
    if (!userWithBadges) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateBountySchema, parsed.data)
    if ('error' in validation) return validation.error
    const { title, description, category, difficulty, estimatedHours, rewardSand } = validation.value
    const rewardSandValue = rewardSand ?? 250
    const availableSand = await getAvailableSand(user.id, userWithBadges.totalXP, userWithBadges.userBadges.length)

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
