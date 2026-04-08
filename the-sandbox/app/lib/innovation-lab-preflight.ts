/**
 * innovation-lab-preflight.ts
 *
 * Loads user context for Innovation Lab tools. Lightweight —
 * pulls user profile, department, research/portfolio items, and courses.
 */

import { prisma } from './prisma'

export interface InnovationLabPreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    bio: string | null
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN' | 'STAFF'
  }
  courses: { code: string; title: string }[]
  portfolio: {
    projects: { title: string; description: string | null; skills: string[] }[]
    publications: { title: string; organization: string | null }[]
    experiences: { title: string; organization: string | null; description: string | null }[]
  }
  interests: string[]
  memories: {
    goals: string[]
    strengths: string[]
    projects: string[]
  }
}

export async function getInnovationLabPreflight(userId: string): Promise<InnovationLabPreflight> {
  const [user, enrollments, portfolioItems, interests, memories] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        department: true,
        college: true,
        bio: true,
        role: true,
      },
    }),
    prisma.courseEnrollment
      .findMany({
        where: { studentId: userId },
        select: { course: { select: { courseCode: true, title: true } } },
        take: 15,
      })
      .catch(() => []),
    prisma.portfolioItem
      .findMany({
        where: { userId },
        select: { type: true, title: true, organization: true, description: true, skills: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      })
      .catch(() => []),
    prisma.userInterest
      .findMany({
        where: { userId, accepted: true },
        select: { tag: true },
        take: 15,
      })
      .catch(() => []),
    prisma.userMemory
      .findMany({
        where: { userId, category: { in: ['GOALS', 'STRENGTHS', 'PROJECTS'] } },
        select: { category: true, content: true },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => []),
  ])

  const portfolio: InnovationLabPreflight['portfolio'] = {
    projects: [],
    publications: [],
    experiences: [],
  }
  for (const item of portfolioItems) {
    const base = { title: item.title, organization: item.organization, description: item.description, skills: item.skills }
    if (item.type === 'PROJECT') portfolio.projects.push(base)
    else if (item.type === 'PUBLICATION') portfolio.publications.push(base)
    else if (item.type === 'EXPERIENCE') portfolio.experiences.push(base)
  }

  const memoryByCategory: Record<string, string[]> = {}
  for (const m of memories) {
    if (!memoryByCategory[m.category]) memoryByCategory[m.category] = []
    memoryByCategory[m.category].push(m.content)
  }

  return {
    user: { ...user, role: user.role as InnovationLabPreflight['user']['role'] },
    courses: enrollments.map((e) => ({ code: e.course.courseCode, title: e.course.title })),
    portfolio,
    interests: interests.map((i) => i.tag),
    memories: {
      goals: memoryByCategory['GOALS'] ?? [],
      strengths: memoryByCategory['STRENGTHS'] ?? [],
      projects: memoryByCategory['PROJECTS'] ?? [],
    },
  }
}
