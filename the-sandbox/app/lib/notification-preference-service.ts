import { prisma } from './prisma'

/** All notification types users can configure preferences for */
const ALL_NOTIFICATION_TYPES = [
  'COMMENT_ON_TOOL',
  'COMMENT_REPLY',
  'UKNOW_ALERT',
  'COURSE_MAP_UPDATED',
  'MAP_NODE_ADDED',
  'MAP_DUE_DATE_CHANGED',
  'MAP_PUBLISHED',
  'LIVE_ROOM_STARTED',
  'STAFF_ALERT_P0',
  'STAFF_ALERT_INFO',
  'TOOL_APPROVED',
  'DOCUMENT_SHARED',
] as const

/** Types that cannot be disabled — critical alerts always stay on */
const LOCKED_TYPES = new Set(['STAFF_ALERT_P0'])

/** Human-friendly labels for each notification type */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  COMMENT_ON_TOOL: 'Comments on your tools',
  COMMENT_REPLY: 'Replies to your comments',
  UKNOW_ALERT: 'UKNow alerts',
  COURSE_MAP_UPDATED: 'Course map updates',
  MAP_NODE_ADDED: 'New map nodes added',
  MAP_DUE_DATE_CHANGED: 'Map due date changes',
  MAP_PUBLISHED: 'Map published',
  LIVE_ROOM_STARTED: 'Live room started',
  STAFF_ALERT_P0: 'Staff Alerts (Critical)',
  STAFF_ALERT_INFO: 'Staff Alerts (Informational)',
  TOOL_APPROVED: 'Tool approved',
  DOCUMENT_SHARED: 'Documents shared with you',
}

/**
 * Returns all notification preferences for a user.
 * Auto-creates defaults for any missing types.
 */
export async function getPreferences(userId: string) {
  const existing = await prisma.userNotificationPreference.findMany({
    where: { userId },
    orderBy: { type: 'asc' },
  })

  const existingTypes = new Set(existing.map((p) => p.type))
  const missing = ALL_NOTIFICATION_TYPES.filter((t) => !existingTypes.has(t))

  if (missing.length > 0) {
    await prisma.userNotificationPreference.createMany({
      data: missing.map((type) => ({
        userId,
        type,
        enabled: true,
        channel: 'in_app',
      })),
      skipDuplicates: true,
    })

    // Re-fetch to include newly created defaults
    return prisma.userNotificationPreference.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
    })
  }

  return existing
}

/**
 * Bulk upsert notification preferences.
 * Enforces that STAFF_ALERT_P0 cannot be disabled.
 */
export async function updatePreferences(
  userId: string,
  prefs: { type: string; enabled: boolean; channel: string }[]
) {
  const ops = prefs.map((pref) => {
    // Enforce: P0 staff alerts cannot be turned off
    const isLocked = LOCKED_TYPES.has(pref.type)
    const enabled = isLocked ? true : pref.enabled
    const channel = isLocked ? 'in_app' : pref.channel

    return prisma.userNotificationPreference.upsert({
      where: { userId_type: { userId, type: pref.type } },
      create: { userId, type: pref.type, enabled, channel },
      update: { enabled, channel },
    })
  })

  return Promise.all(ops)
}

/**
 * Check whether a notification should be created for a user+type.
 * Returns true if no preference exists (default on) or if enabled.
 */
export async function shouldCreateNotification(
  userId: string,
  type: string
): Promise<boolean> {
  // P0 alerts always go through
  if (LOCKED_TYPES.has(type)) return true

  const pref = await prisma.userNotificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  })

  // No preference stored = default on
  if (!pref) return true

  return pref.enabled && pref.channel !== 'off'
}
