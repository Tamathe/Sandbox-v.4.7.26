import { prisma } from '../prisma'
import { getUserGroupRole } from '../group-chat-service'

type Level = 'ALL' | 'MENTIONS' | 'NONE'

/**
 * Get the notification preference for a user in a group.
 * Returns ALL if no record exists (default).
 */
export async function getNotificationPreference(
  userId: string,
  groupId: string,
): Promise<{ level: Level } | { error: string; status: number }> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Forbidden', status: 403 }

  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { level: true },
  })

  return { level: (pref?.level as Level) ?? 'ALL' }
}

/**
 * Set the notification preference for a user in a group.
 * Upserts the NotificationPreference record.
 */
export async function setNotificationPreference(
  userId: string,
  groupId: string,
  level: Level,
): Promise<{ level: Level } | { error: string; status: number }> {
  const role = await getUserGroupRole(userId, groupId)
  if (role === null) return { error: 'Forbidden', status: 403 }

  const validLevels: Level[] = ['ALL', 'MENTIONS', 'NONE']
  if (!validLevels.includes(level)) {
    return { error: 'Invalid level. Must be ALL, MENTIONS, or NONE', status: 400 }
  }

  const pref = await prisma.notificationPreference.upsert({
    where: { userId_groupId: { userId, groupId } },
    update: { level },
    create: { userId, groupId, level },
    select: { level: true },
  })

  return { level: pref.level as Level }
}
