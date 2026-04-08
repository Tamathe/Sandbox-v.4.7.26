/**
 * Announcements service — extracted Prisma queries from /api/announcements route.
 */

import { prisma } from './prisma'

export async function getActiveAnnouncements() {
  const now = new Date()
  return prisma.adminAnnouncement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      message: true,
      tone: true,
      dismissible: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
  })
}
