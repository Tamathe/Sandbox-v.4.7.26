import { prisma } from './prisma'

export interface PolicyAnalytics {
  totalEnrolled: number
  acknowledgedCount: number
  ackRate: number
  avgDaysToAck: number | null
  latestAck: { name: string; date: string } | null
}

export async function getPolicyAnalytics(courseId: string): Promise<PolicyAnalytics> {
  const [totalEnrolled, acknowledgedCount, acks] = await Promise.all([
    prisma.courseEnrollment.count({ where: { courseId } }),
    prisma.coursePolicyAck.count({ where: { courseId } }),
    prisma.coursePolicyAck.findMany({
      where: { courseId },
      select: {
        ackedAt: true,
        user: { select: { name: true } },
        userId: true,
      },
      orderBy: { ackedAt: 'desc' },
    }),
  ])

  if (totalEnrolled === 0) {
    return { totalEnrolled: 0, acknowledgedCount: 0, ackRate: 0, avgDaysToAck: null, latestAck: null }
  }

  const ackRate = Math.round((acknowledgedCount / totalEnrolled) * 100)

  // Compute average days to acknowledge
  let avgDaysToAck: number | null = null
  if (acks.length > 0) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId, studentId: { in: acks.map((a) => a.userId) } },
      select: { studentId: true, enrolledAt: true },
    })
    const enrollMap = new Map(enrollments.map((e) => [e.studentId, e.enrolledAt]))

    let totalDays = 0
    let count = 0
    for (const ack of acks) {
      const enrolledAt = enrollMap.get(ack.userId)
      if (enrolledAt) {
        const diff = (ack.ackedAt.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
        totalDays += Math.max(0, diff)
        count++
      }
    }
    avgDaysToAck = count > 0 ? Math.round((totalDays / count) * 10) / 10 : null
  }

  // Latest ack
  const latestAck = acks.length > 0
    ? { name: acks[0].user.name ?? 'Unknown', date: acks[0].ackedAt.toISOString() }
    : null

  return { totalEnrolled, acknowledgedCount, ackRate, avgDaysToAck, latestAck }
}
