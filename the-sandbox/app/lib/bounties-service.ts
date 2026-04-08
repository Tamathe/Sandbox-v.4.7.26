/**
 * Bounties service — extracted Prisma queries from /api/bounties route.
 */

import { prisma } from './prisma'
import { BOUNTY_INCLUDE } from './prisma-includes'

export async function getBounties(filters: { status?: string; category?: string }) {
  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.category) where.category = filters.category

  return prisma.bounty.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: BOUNTY_INCLUDE,
  })
}

export async function createBounty(
  userId: string,
  data: {
    title: string
    description: string
    category: string
    difficulty?: string | null
    estimatedHours?: string | number | null
  },
) {
  const created = await prisma.bounty.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty || null,
      estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
      postedById: userId,
    },
  })

  return prisma.bounty.findUniqueOrThrow({
    where: { id: created.id },
    include: {
      postedBy: { select: { id: true, name: true, department: true, role: true } },
      claimedBy: { select: { id: true, name: true, department: true } },
      _count: { select: { reviews: true } },
    },
  })
}
