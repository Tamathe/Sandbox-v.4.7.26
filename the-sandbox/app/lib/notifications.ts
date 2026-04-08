import { NotificationType } from '../generated/prisma'
import { prisma } from './prisma'
import { shouldCreateNotification } from './notification-preference-service'

type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  body: string
  href?: string | null
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  href,
}: CreateNotificationInput) {
  // Check user's notification preference before creating
  const shouldCreate = await shouldCreateNotification(userId, type)
  if (!shouldCreate) return null

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      href: href ?? null,
    },
  })
}
