import { prisma } from './prisma'

// ── T2: Policy Acceptance Tracking ──────────────────────────────────────────

export async function recordAcceptance(opts: {
  userId: string
  policyType: string
  policyVersion: string
  ipAddress?: string
  userAgent?: string
}) {
  return prisma.policyAcceptanceRecord.create({
    data: {
      userId: opts.userId,
      policyType: opts.policyType,
      policyVersion: opts.policyVersion,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
    },
  })
}

export async function withdrawAcceptance(
  recordId: string,
  reason: string,
) {
  return prisma.policyAcceptanceRecord.update({
    where: { id: recordId },
    data: {
      withdrawnAt: new Date(),
      withdrawReason: reason,
    },
  })
}

export async function getUserAcceptanceHistory(userId: string) {
  return prisma.policyAcceptanceRecord.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'desc' },
  })
}

export async function getCurrentAcceptances(userId: string) {
  // Get the latest acceptance per policy type
  const records = await prisma.policyAcceptanceRecord.findMany({
    where: { userId, withdrawnAt: null },
    orderBy: { acceptedAt: 'desc' },
  })

  // Deduplicate — keep latest per policyType
  const seen = new Set<string>()
  const latest: typeof records = []
  for (const r of records) {
    if (!seen.has(r.policyType)) {
      seen.add(r.policyType)
      latest.push(r)
    }
  }
  return latest
}

export async function getPolicyAcceptanceStats() {
  const policyTypes = ['tos', 'privacy', 'ferpa', 'data-processing', 'acceptable-use']
  const totalUsers = await prisma.user.count()

  const stats = await Promise.all(
    policyTypes.map(async (policyType) => {
      const [totalAccepted, withdrawn] = await Promise.all([
        prisma.policyAcceptanceRecord.count({
          where: { policyType, withdrawnAt: null },
        }),
        prisma.policyAcceptanceRecord.count({
          where: { policyType, withdrawnAt: { not: null } },
        }),
      ])

      // Find the latest version
      const latestRecord = await prisma.policyAcceptanceRecord.findFirst({
        where: { policyType, withdrawnAt: null },
        orderBy: { acceptedAt: 'desc' },
        select: { policyVersion: true },
      })
      const currentVersion = latestRecord?.policyVersion ?? 'none'

      const currentVersionAccepted = latestRecord
        ? await prisma.policyAcceptanceRecord.count({
            where: { policyType, policyVersion: currentVersion, withdrawnAt: null },
          })
        : 0

      return {
        policyType,
        totalAccepted,
        currentVersion,
        currentVersionAccepted,
        currentVersionPct: totalUsers > 0 ? Math.round((currentVersionAccepted / totalUsers) * 100) : 0,
        withdrawn,
        totalUsers,
      }
    }),
  )

  return stats
}
