import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [users, consentVersions, retentionPolicies, auditLogTotal, auditLogLast30, auditLogByAction] =
    await Promise.all([
      prisma.user.findMany({
        select: {
          name: true,
          email: true,
          role: true,
          tosAcceptedAt: true,
          dataConsentAt: true,
          ferpaAckAt: true,
          acceptedTosVersion: true,
          acceptedConsentVersion: true,
          acceptedFerpaVersion: true,
          consentCategories: {
            select: {
              category: true,
              consentedAt: true,
              revokedAt: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.consentVersion.findMany({
        orderBy: { effectiveAt: 'desc' },
      }),
      prisma.dataRetentionPolicy.findMany({
        where: { active: true },
      }),
      prisma.complianceAuditLog.count(),
      prisma.complianceAuditLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.complianceAuditLog.groupBy({
        by: ['action'],
        _count: { action: true },
      }),
    ])

  // Group consent versions by type
  const versionsByType: Record<string, typeof consentVersions> = {}
  for (const v of consentVersions) {
    if (!versionsByType[v.type]) versionsByType[v.type] = []
    versionsByType[v.type].push(v)
  }

  // Build byAction map
  const byAction: Record<string, number> = {}
  for (const row of auditLogByAction) {
    byAction[row.action] = row._count.action
  }

  // Map users with consent categories
  const mappedUsers = users.map((u) => ({
    name: u.name,
    email: u.email,
    role: u.role,
    tosAcceptedAt: u.tosAcceptedAt,
    dataConsentAt: u.dataConsentAt,
    ferpaAckAt: u.ferpaAckAt,
    acceptedTosVersion: u.acceptedTosVersion,
    acceptedConsentVersion: u.acceptedConsentVersion,
    acceptedFerpaVersion: u.acceptedFerpaVersion,
    consentCategories: u.consentCategories.map((c) => ({
      category: c.category,
      consented: !c.revokedAt,
      consentedAt: c.consentedAt,
      revokedAt: c.revokedAt,
    })),
  }))

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    userCount: mappedUsers.length,
    users: mappedUsers,
    consentVersions: versionsByType,
    retentionPolicies,
    auditLogSummary: {
      totalEntries: auditLogTotal,
      last30Days: auditLogLast30,
      byAction,
    },
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
