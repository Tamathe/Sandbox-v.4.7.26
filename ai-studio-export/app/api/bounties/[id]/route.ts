import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

const BountyActionSchema = z.object({
  action: z.enum(['claim', 'unclaim', 'fulfill', 'close']),
  toolId: z.string().optional(),
})

class BountyActionError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

const BOUNTY_INCLUDE = {
  postedBy: { select: { id: true, name: true, department: true, college: true, role: true } },
  claimedBy: { select: { id: true, name: true, department: true } },
  reviews: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      reviewer: { select: { id: true, name: true, department: true, role: true } },
    },
  },
  _count: { select: { reviews: true } },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const bounty = await prisma.bounty.findUnique({
      where: { id },
      include: BOUNTY_INCLUDE,
    })

    if (!bounty) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ bounty })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch bounty' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const bounty = await prisma.bounty.findUnique({ where: { id } })
    if (!bounty) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const parsedBody = await parseRequestBody(req)
    if ('error' in parsedBody) return parsedBody.error
    const validation = validateBody(BountyActionSchema, parsedBody.data)
    if ('error' in validation) return validation.error
    const body = validation.value
    const { action } = body

    if (action === 'claim') {
      if (user.role === 'STUDENT') {
        return NextResponse.json({ error: 'Students cannot claim bounties yet' }, { status: 403 })
      }
      if (bounty.status !== 'OPEN') {
        return NextResponse.json({ error: 'Bounty is not open for claiming' }, { status: 400 })
      }
      if (bounty.postedById === user.id) {
        return NextResponse.json({ error: 'Cannot claim your own bounty' }, { status: 400 })
      }

      const updated = await prisma.bounty.update({
        where: { id },
        data: { status: 'CLAIMED', claimedById: user.id, claimedAt: new Date() },
        include: BOUNTY_INCLUDE,
      })

      return NextResponse.json({ bounty: updated })
    }

    if (action === 'unclaim') {
      if (bounty.claimedById !== user.id && user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const updated = await prisma.bounty.update({
        where: { id },
        data: { status: 'OPEN', claimedById: null, claimedAt: null },
        include: BOUNTY_INCLUDE,
      })

      return NextResponse.json({ bounty: updated })
    }

    if (action === 'fulfill') {
      if (bounty.claimedById !== user.id && user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const updated = await prisma.$transaction(async (tx) => {
        const existingReward = await tx.sandTransaction.findFirst({
          where: { bountyId: id, reason: 'bounty_reward' },
        })
        if (existingReward) {
          throw new BountyActionError('Bounty reward has already been paid.', 409)
        }

        const fulfilled = await tx.bounty.update({
          where: { id },
          data: { status: 'FULFILLED', fulfilledToolId: body.toolId || null },
        })

        const rewardRecipientId = fulfilled.claimedById ?? user.id
        if (fulfilled.rewardSand > 0) {
          await tx.sandTransaction.create({
            data: {
              userId: rewardRecipientId,
              amount: fulfilled.rewardSand,
              reason: 'bounty_reward',
              description: `Reward for fulfilling bounty "${fulfilled.title}"`,
              bountyId: fulfilled.id,
              toolId: body.toolId || null,
            },
          })
        }

        return tx.bounty.findUniqueOrThrow({
          where: { id },
          include: BOUNTY_INCLUDE,
        })
      })

      return NextResponse.json({ bounty: updated })
    }

    if (action === 'close' && (bounty.postedById === user.id || user.role === 'ADMIN')) {
      const updated = await prisma.$transaction(async (tx) => {
        const existingRefund = await tx.sandTransaction.findFirst({
          where: { bountyId: id, reason: 'bounty_refund' },
        })
        const existingReward = await tx.sandTransaction.findFirst({
          where: { bountyId: id, reason: 'bounty_reward' },
        })

        if (!existingRefund && !existingReward && bounty.rewardSand > 0) {
          await tx.sandTransaction.create({
            data: {
              userId: bounty.postedById,
              amount: bounty.rewardSand,
              reason: 'bounty_refund',
              description: `Refunded reserved Sand for closed bounty "${bounty.title}"`,
              bountyId: bounty.id,
            },
          })
        }

        await tx.bounty.update({
          where: { id },
          data: { status: 'CLOSED' },
        })

        return tx.bounty.findUniqueOrThrow({
          where: { id },
          include: BOUNTY_INCLUDE,
        })
      })

      return NextResponse.json({ bounty: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Failed to update bounty'
    const status = err instanceof BountyActionError ? err.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
