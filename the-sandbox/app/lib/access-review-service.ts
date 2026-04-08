import { prisma } from './prisma'

// ── Access Review Service ───────────────────────────────────────────────────
// Periodic access review system to verify users still need their current
// access levels. Generates findings about privileged roles, stale accounts, etc.

export async function createReview(reviewCycle: string) {
  const totalUsers = await prisma.user.count()
  return prisma.accessReview.create({
    data: {
      reviewCycle,
      totalUsers,
    },
  })
}

export async function startReview(id: string, reviewerId: string) {
  return prisma.accessReview.update({
    where: { id },
    data: {
      status: 'in-progress',
      startedAt: new Date(),
      reviewedBy: reviewerId,
    },
  })
}

export async function completeReview(id: string) {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [adminUsers, registrarUsers, suspendedUsers, staleUsers, complianceRoles, totalUsers] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, email: true, lastSeenAt: true },
      }),
      prisma.user.findMany({
        where: { role: 'REGISTRAR' },
        select: { id: true, name: true, email: true, lastSeenAt: true },
      }),
      prisma.user.findMany({
        where: { suspended: true },
        select: { id: true, name: true, email: true, suspendedReason: true },
      }),
      prisma.user.findMany({
        where: { lastSeenAt: { lt: ninetyDaysAgo } },
        select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
      }),
      prisma.complianceRole.findMany({
        select: { id: true, userId: true, role: true, user: { select: { name: true, email: true } } },
      }),
      prisma.user.count(),
    ])

  let changesRecommended = 0
  // Users not seen in 90+ days with privileged roles should be flagged
  const stalePrivileged = staleUsers.filter(
    (u) => u.role === 'ADMIN' || u.role === 'REGISTRAR',
  )
  changesRecommended += stalePrivileged.length
  // Suspended users still in the system
  changesRecommended += suspendedUsers.length

  const findings = {
    adminUsers: adminUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, lastSeenAt: u.lastSeenAt })),
    registrarUsers: registrarUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, lastSeenAt: u.lastSeenAt })),
    suspendedUsers: suspendedUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, reason: u.suspendedReason })),
    staleUsers: staleUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, lastSeenAt: u.lastSeenAt })),
    complianceRoles: complianceRoles.map((cr) => ({ id: cr.id, role: cr.role, userName: cr.user.name, userEmail: cr.user.email })),
    stalePrivilegedCount: stalePrivileged.length,
    summary: {
      totalAdmins: adminUsers.length,
      totalRegistrars: registrarUsers.length,
      totalSuspended: suspendedUsers.length,
      totalStale90Days: staleUsers.length,
      totalComplianceRoles: complianceRoles.length,
    },
  }

  return prisma.accessReview.update({
    where: { id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      usersReviewed: totalUsers,
      changesRecommended,
      findings,
    },
  })
}

export async function listReviews() {
  return prisma.accessReview.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: { select: { name: true, email: true } },
    },
  })
}

export async function getReview(id: string) {
  return prisma.accessReview.findUnique({
    where: { id },
    include: {
      reviewer: { select: { name: true, email: true } },
    },
  })
}

export async function deleteReview(id: string) {
  return prisma.accessReview.delete({ where: { id } })
}
