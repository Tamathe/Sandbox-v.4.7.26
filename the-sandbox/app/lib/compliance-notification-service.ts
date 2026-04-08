import { prisma } from './prisma'

const DAY_MS = 86_400_000

// ── Generate compliance notifications for all users ─────────────────────────

export async function generateComplianceNotifications(): Promise<number> {
  const now = new Date()
  let count = 0

  // 1. Consent expiring within 30 days
  const consentThreshold = new Date(now.getTime() - (335 * DAY_MS)) // 365 - 30 = 335 days ago
  const usersWithExpiringConsent = await prisma.user.findMany({
    where: {
      dataConsentAt: { not: null, lte: consentThreshold },
      suspended: false,
    },
    select: { id: true },
  })

  for (const user of usersWithExpiringConsent) {
    const existing = await prisma.complianceNotification.findFirst({
      where: {
        userId: user.id,
        type: 'consent-expiring',
        createdAt: { gte: new Date(now.getTime() - (7 * DAY_MS)) },
      },
    })
    if (!existing) {
      await prisma.complianceNotification.create({
        data: {
          userId: user.id,
          type: 'consent-expiring',
          title: 'Data Consent Expiring Soon',
          message: 'Your data consent will expire within 30 days. Please visit your privacy settings to renew.',
        },
      })
      count++
    }
  }

  // 2. FERPA ack overdue (educators/admins > 1 year)
  const ferpaThreshold = new Date(now.getTime() - (365 * DAY_MS))
  const educatorsOverdue = await prisma.user.findMany({
    where: {
      role: { in: ['EDUCATOR', 'ADMIN'] },
      suspended: false,
      OR: [
        { ferpaAckAt: null },
        { ferpaAckAt: { lte: ferpaThreshold } },
      ],
    },
    select: { id: true },
  })

  for (const user of educatorsOverdue) {
    const existing = await prisma.complianceNotification.findFirst({
      where: {
        userId: user.id,
        type: 'ferpa-overdue',
        createdAt: { gte: new Date(now.getTime() - (7 * DAY_MS)) },
      },
    })
    if (!existing) {
      await prisma.complianceNotification.create({
        data: {
          userId: user.id,
          type: 'ferpa-overdue',
          title: 'FERPA Training Overdue',
          message: 'Your FERPA acknowledgement is overdue. Please complete the FERPA training quiz to maintain compliance.',
        },
      })
      count++
    }
  }

  // 3. DPA expiring within 60 days — notify admins
  const dpaThreshold = new Date(now.getTime() + (60 * DAY_MS))
  const expiringDPAs = await prisma.dataProcessingAgreement.findMany({
    where: {
      active: true,
      expiresAt: { lte: dpaThreshold, gte: now },
    },
    select: { id: true, vendorName: true, expiresAt: true },
  })

  if (expiringDPAs.length > 0) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', suspended: false },
      select: { id: true },
    })
    for (const admin of admins) {
      for (const dpa of expiringDPAs) {
        const existing = await prisma.complianceNotification.findFirst({
          where: {
            userId: admin.id,
            type: 'dpa-expiring',
            message: { contains: dpa.vendorName },
            createdAt: { gte: new Date(now.getTime() - (7 * DAY_MS)) },
          },
        })
        if (!existing) {
          const daysLeft = Math.ceil((dpa.expiresAt.getTime() - now.getTime()) / DAY_MS)
          await prisma.complianceNotification.create({
            data: {
              userId: admin.id,
              type: 'dpa-expiring',
              title: 'DPA Expiring Soon',
              message: `Data Processing Agreement with ${dpa.vendorName} expires in ${daysLeft} days. Review and renew if needed.`,
            },
          })
          count++
        }
      }
    }
  }

  // 4. New consent version published since last notification
  const latestVersions = await prisma.consentVersion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    distinct: ['type'],
  })

  for (const version of latestVersions) {
    // Only notify if version was created in the last 7 days
    if (now.getTime() - version.createdAt.getTime() > 7 * DAY_MS) continue

    const typeLabel = version.type === 'tos' ? 'Terms of Service' : version.type === 'consent' ? 'Data Consent' : 'FERPA Policy'
    const allUsers = await prisma.user.findMany({
      where: { suspended: false },
      select: { id: true },
    })

    for (const user of allUsers) {
      const existing = await prisma.complianceNotification.findFirst({
        where: {
          userId: user.id,
          type: 'new-consent-version',
          message: { contains: version.version },
          createdAt: { gte: new Date(now.getTime() - (7 * DAY_MS)) },
        },
      })
      if (!existing) {
        await prisma.complianceNotification.create({
          data: {
            userId: user.id,
            type: 'new-consent-version',
            title: `New ${typeLabel} Version`,
            message: `A new version (${version.version}) of the ${typeLabel} has been published. Please review and accept the updated policy.`,
          },
        })
        count++
      }
    }
  }

  return count
}

// ── Get notifications for a user ────────────────────────────────────────────

export async function getComplianceNotifications(userId: string) {
  return prisma.complianceNotification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
}

// ── Mark a single notification as read ──────────────────────────────────────

export async function markNotificationRead(id: string, userId: string) {
  return prisma.complianceNotification.updateMany({
    where: { id, userId },
    data: { read: true },
  })
}
