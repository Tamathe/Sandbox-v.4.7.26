import { prisma } from './prisma'

export interface InstitutionalResumePreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    role: string
    bio: string | null
    title: string | null
  }
  sandboxActivity: {
    coursesOwned: { title: string; courseCode: string; studentCount: number }[]
    coursesEnrolled: { title: string; courseCode: string }[]
    toolsBuilt: { name: string; useCount: number }[]
    committeeMemberships: { name: string; role: string }[]
    policiesAuthored: number
  }
  portfolio: {
    experiences: { title: string; organization: string; description: string | null; startDate: Date | null; endDate: Date | null }[]
    projects: { title: string; description: string | null }[]
    publications: { title: string; description: string | null }[]
    certifications: { title: string; description: string | null }[]
    awards: { title: string; description: string | null }[]
  }
  memories: { category: string; content: string }[]
  interests: string[]
  existingResume: string | null
}

export async function getInstitutionalResumePreflight(userId: string): Promise<InstitutionalResumePreflight> {
  const [user, coursesOwned, enrollments, toolsBuilt, committees, policiesCount, portfolio, memories, interests] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, department: true, college: true, role: true, bio: true, title: true },
    }),
    prisma.course.findMany({
      where: { instructorId: userId },
      select: { title: true, courseCode: true, _count: { select: { enrollments: true } } },
      take: 20,
    }).catch((): { title: string; courseCode: string; _count: { enrollments: number } }[] => []),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { course: { select: { title: true, courseCode: true } } },
      take: 15,
    }).catch((): { course: { title: string; courseCode: string } }[] => []),
    prisma.tool.findMany({
      where: { creatorId: userId },
      select: { name: true, _count: { select: { sessions: true } } },
      take: 20,
    }).catch((): { name: string; _count: { sessions: number } }[] => []),
    prisma.committee.findMany({
      where: { chairId: userId },
      select: { name: true },
    }).catch((): { name: string }[] => []),
    prisma.policyDocument.count({ where: { isActive: true } }).then(() => 0).catch(() => 0),
    prisma.portfolioItem.findMany({
      where: { userId },
      select: { type: true, title: true, organization: true, description: true, startDate: true, endDate: true },
      orderBy: { startDate: 'desc' },
      take: 30,
    }).catch((): { type: string; title: string; organization: string | null; description: string | null; startDate: Date | null; endDate: Date | null }[] => []),
    prisma.userMemory.findMany({
      where: { userId },
      select: { category: true, content: true },
      take: 20,
    }).catch((): { category: string; content: string }[] => []),
    prisma.userInterest.findMany({
      where: { userId, accepted: true },
      select: { tag: true },
      take: 15,
    }).catch((): { tag: string }[] => []),
  ])

  const experiences = portfolio.filter((p) => p.type === 'EXPERIENCE').map((p) => ({
    title: p.title, organization: p.organization ?? '', description: p.description, startDate: p.startDate, endDate: p.endDate,
  }))
  const projects = portfolio.filter((p) => p.type === 'PROJECT').map((p) => ({ title: p.title, description: p.description }))
  const publications = portfolio.filter((p) => p.type === 'PUBLICATION').map((p) => ({ title: p.title, description: p.description }))
  const certifications = portfolio.filter((p) => p.type === 'CERTIFICATION').map((p) => ({ title: p.title, description: p.description }))
  const awards = portfolio.filter((p) => p.type === 'AWARD').map((p) => ({ title: p.title, description: p.description }))

  return {
    user: { ...user, role: user.role as string },
    sandboxActivity: {
      coursesOwned: coursesOwned.map((c) => ({ title: c.title, courseCode: c.courseCode, studentCount: c._count.enrollments })),
      coursesEnrolled: enrollments.map((e) => ({ title: e.course.title, courseCode: e.course.courseCode })),
      toolsBuilt: toolsBuilt.map((t) => ({ name: t.name, useCount: t._count.sessions })),
      committeeMemberships: committees.map((c) => ({ name: c.name, role: 'Chair' })),
      policiesAuthored: policiesCount,
    },
    portfolio: { experiences, projects, publications, certifications, awards },
    memories: memories.map((m) => ({ category: m.category, content: m.content })),
    interests: interests.map((i) => i.tag),
    existingResume: null,
  }
}
