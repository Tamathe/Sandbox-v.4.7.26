/**
 * Notifications service — extracted Prisma queries from /api/notifications route.
 */

import { prisma } from './prisma'

export async function getUserNotifications(userId: string, limit: number) {
  return Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ])
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })
}

export async function findUserNotification(userId: string, notificationId: string) {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: { id: true },
  })
}

export async function markNotificationRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}
