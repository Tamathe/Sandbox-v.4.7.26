import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  // Look up consent retention policy for expiry window calculation
  const consentPolicy = await prisma.dataRetentionPolicy.findUnique({
    where: { dataCategory: 'data-consent' },
    select: { active: true, retentionDays: true },
  })
  const consentRetentionDays = consentPolicy?.active ? consentPolicy.retentionDays : 365

  const now = new Date()
  const consentExpiryDate = new Date(now)
  consentExpiryDate.setDate(consentExpiryDate.getDate() - consentRetentionDays)
  const consentWarnDate = new Date(consentExpiryDate)
  consentWarnDate.setDate(consentWarnDate.getDate() + 30) // within 30 days of expiry

  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const [users, consentExpiringSoon, ferpaRenewalNeeded] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tosAcceptedAt: true,
        dataConsentAt: true,
        ferpaAckAt: true,
      },
      orderBy: { name: 'asc' },
    }),
    // Users whose dataConsentAt is between expiryDate and warnDate (expiring within 30 days)
    prisma.user.count({
      where: {
        dataConsentAt: {
          not: null,
          lt: consentWarnDate,
          gte: consentExpiryDate,
        },
      },
    }),
    // EDUCATOR/ADMIN users whose ferpaAckAt is older than 365 days
    prisma.user.count({
      where: {
        role: { in: ['EDUCATOR', 'ADMIN'] },
        ferpaAckAt: { not: null, lt: oneYearAgo },
      },
    }),
  ])

  const total = users.length
  const tosCount = users.filter((u) => u.tosAcceptedAt !== null).length
  const consentCount = users.filter((u) => u.dataConsentAt !== null).length
  const ferpaCount = users.filter((u) => u.ferpaAckAt !== null).length

  return NextResponse.json({
    counts: {
      total,
      tosAccepted: tosCount,
      consentAccepted: consentCount,
      ferpaAcknowledged: ferpaCount,
      consentExpiringSoon,
      ferpaRenewalNeeded,
    },
    users,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
