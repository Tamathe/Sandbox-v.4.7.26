import { prisma } from './prisma'

const VALID_CHANNELS = ['in-app', 'email', 'both', 'none'] as const
const VALID_FREQUENCIES = ['immediate', 'daily', 'weekly', 'none'] as const

type NotificationType = 'consentReminders' | 'ferpaAlerts' | 'policyUpdates' | 'incidentNotifications' | 'trainingReminders'

const DEFAULT_PREFS = {
  channel: 'in-app' as const,
  consentReminders: true,
  ferpaAlerts: true,
  policyUpdates: true,
  incidentNotifications: true,
  trainingReminders: true,
  digestFrequency: 'daily' as const,
}

/**
 * Get notification preferences for a user. Returns defaults if no record exists.
 */
export async function getPreferences(userId: string) {
  const prefs = await prisma.complianceNotificationPreference.findUnique({
    where: { userId },
  })

  if (!prefs) {
    return { userId, ...DEFAULT_PREFS, id: null, createdAt: null, updatedAt: null }
  }

  return prefs
}

/**
 * Update (upsert) notification preferences.
 */
export async function updatePreferences(
  userId: string,
  updates: {
    channel?: string
    consentReminders?: boolean
    ferpaAlerts?: boolean
    policyUpdates?: boolean
    incidentNotifications?: boolean
    trainingReminders?: boolean
    digestFrequency?: string
  },
) {
  // Validate channel
  if (updates.channel && !VALID_CHANNELS.includes(updates.channel as (typeof VALID_CHANNELS)[number])) {
    throw new Error(`Invalid channel: ${updates.channel}. Must be one of: ${VALID_CHANNELS.join(', ')}`)
  }
  // Validate digestFrequency
  if (updates.digestFrequency && !VALID_FREQUENCIES.includes(updates.digestFrequency as (typeof VALID_FREQUENCIES)[number])) {
    throw new Error(`Invalid digest frequency: ${updates.digestFrequency}. Must be one of: ${VALID_FREQUENCIES.join(', ')}`)
  }

  return prisma.complianceNotificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      channel: updates.channel ?? DEFAULT_PREFS.channel,
      consentReminders: updates.consentReminders ?? DEFAULT_PREFS.consentReminders,
      ferpaAlerts: updates.ferpaAlerts ?? DEFAULT_PREFS.ferpaAlerts,
      policyUpdates: updates.policyUpdates ?? DEFAULT_PREFS.policyUpdates,
      incidentNotifications: updates.incidentNotifications ?? DEFAULT_PREFS.incidentNotifications,
      trainingReminders: updates.trainingReminders ?? DEFAULT_PREFS.trainingReminders,
      digestFrequency: updates.digestFrequency ?? DEFAULT_PREFS.digestFrequency,
    },
    update: {
      ...(updates.channel !== undefined && { channel: updates.channel }),
      ...(updates.consentReminders !== undefined && { consentReminders: updates.consentReminders }),
      ...(updates.ferpaAlerts !== undefined && { ferpaAlerts: updates.ferpaAlerts }),
      ...(updates.policyUpdates !== undefined && { policyUpdates: updates.policyUpdates }),
      ...(updates.incidentNotifications !== undefined && { incidentNotifications: updates.incidentNotifications }),
      ...(updates.trainingReminders !== undefined && { trainingReminders: updates.trainingReminders }),
      ...(updates.digestFrequency !== undefined && { digestFrequency: updates.digestFrequency }),
    },
  })
}

/**
 * Check if a user should receive a notification for a given type and channel.
 */
export async function shouldNotify(
  userId: string,
  notificationType: NotificationType,
  deliveryChannel: 'in-app' | 'email',
): Promise<boolean> {
  const prefs = await getPreferences(userId)

  // Check if the notification type is enabled
  if (!prefs[notificationType]) return false

  // Check channel preference
  if (prefs.channel === 'none') return false
  if (prefs.channel === 'both') return true
  return prefs.channel === deliveryChannel
}

/**
 * Get users subscribed to digest notifications at a given frequency.
 */
export async function getDigestSubscribers(frequency: 'daily' | 'weekly') {
  const prefs = await prisma.complianceNotificationPreference.findMany({
    where: {
      digestFrequency: frequency,
      channel: { not: 'none' },
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })
  return prefs.map((p) => p.user)
}
