import { prisma } from '../prisma'

export async function getEnrollmentStats() {
  const [usersByRole, recentSessions] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.toolSession.count({
      where: { startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ])

  return {
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count._all })),
    recentSessions,
  }
}

export async function getPetitionStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [byType, byStatus] = await Promise.all([
    prisma.petition.groupBy({
      by: ['type'],
      _count: { _all: true },
      where: { submittedAt: { gte: since } },
    }),
    prisma.petition.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  return {
    byType: byType.map((r) => ({ type: r.type, count: r._count._all })),
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
  }
}

export async function getArticulationStats() {
  const [byStatus, byRecommendation] = await Promise.all([
    prisma.articulationRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.articulationRequest.groupBy({
      by: ['recommendation'],
      _count: { _all: true },
    }),
  ])

  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    byRecommendation: byRecommendation.map((r) => ({
      recommendation: r.recommendation,
      count: r._count._all,
    })),
  }
}

export async function getDegreeAuditStats() {
  const [total, needingReview, byStatus] = await Promise.all([
    prisma.degreeAuditResult.count(),
    prisma.degreeAuditResult.count({ where: { humanReviewRequired: true, staffReviewedAt: null } }),
    prisma.degreeAuditResult.groupBy({
      by: ['overallStatus'],
      _count: { _all: true },
    }),
  ])

  return {
    total,
    needingReview,
    byStatus: byStatus.map((r) => ({ status: r.overallStatus, count: r._count._all })),
  }
}
