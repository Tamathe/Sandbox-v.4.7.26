/**
 * data-desk-preflight.ts
 *
 * Lightweight preflight for Data Desk tools. Data Desk is input-driven
 * (user provides data), so preflight is mainly for Sandy context —
 * who is this person, what courses are they in, what are they working on.
 */

import { prisma } from './prisma'

export interface DataDeskPreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN'
  }
  courses: { code: string; title: string }[]
  interests: string[]
  recentResearch: { title: string; notes: string | null }[]
}

export async function getDataDeskPreflight(userId: string): Promise<DataDeskPreflight> {
  const [user, enrollments, interests, research] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, department: true, college: true, role: true },
    }),
    prisma.courseEnrollment
      .findMany({
        where: { studentId: userId },
        select: { course: { select: { courseCode: true, title: true } } },
        take: 10,
      })
      .catch(() => []),
    prisma.userInterest
      .findMany({
        where: { userId, accepted: true },
        select: { tag: true },
        take: 10,
      })
      .catch(() => []),
    prisma.researchSession
      .findMany({
        where: { userId },
        select: { title: true, notes: true },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      })
      .catch(() => []),
  ])

  return {
    user: { ...user, role: user.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN' },
    courses: enrollments.map((e) => ({ code: e.course.courseCode, title: e.course.title })),
    interests: interests.map((i) => i.tag),
    recentResearch: research.map((r) => ({ title: r.title, notes: r.notes })),
  }
}
