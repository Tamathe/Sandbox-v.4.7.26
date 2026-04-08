import { NotificationType } from '../generated/prisma'
import { prisma } from './prisma'

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
