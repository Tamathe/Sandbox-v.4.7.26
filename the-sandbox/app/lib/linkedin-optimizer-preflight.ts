/**
 * linkedin-optimizer-preflight.ts
 *
 * Heaviest preflight in Write Room — aggregates full professional identity
 * for LinkedIn optimization. All queries run in Promise.all for <400ms.
 */

import { prisma } from './prisma'

export interface LinkedInPreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    bio: string | null
    personalContext: string | null
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN'
  }
  memories: {
    goals: string[]
    strengths: string[]
    projects: string[]
    identity: string[]
    writingStyle: string | null
  }
  interests: string[]
  courses: { code: string; title: string }[]
  portfolio: {
    experiences: {
      title: string
      organization: string | null
      description: string | null
      skills: string[]
    }[]
    projects: {
      title: string
      description: string | null
      skills: string[]
    }[]
    publications: {
      title: string
      organization: string | null
      description: string | null
    }[]
    certifications: {
      title: string
      organization: string | null
    }[]
    awards: {
      title: string
      organization: string | null
    }[]
  }
  researchSessions: { title: string; notes: string | null }[]
  topConcepts: string[]
  derivedKeywords: string[]
  skillFrequency: Record<string, number>
}

export async function getLinkedInPreflight(userId: string): Promise<LinkedInPreflight> {
  const [user, memories, interests, enrollments, portfolioItems, research, profile] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          department: true,
          college: true,
          bio: true,
          personalContext: true,
          role: true,
        },
      }),
      prisma.userMemory
        .findMany({
          where: {
            userId,
            category: { in: ['GOALS', 'STRENGTHS', 'PROJECTS', 'IDENTITY', 'WRITING_STYLE'] },
          },
          select: { category: true, content: true },
          orderBy: { updatedAt: 'desc' },
        })
        .catch(() => []),
      prisma.userInterest
        .findMany({
          where: { userId, accepted: true },
          select: { tag: true },
          take: 20,
        })
        .catch(() => []),
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
          select: {
            type: true,
            title: true,
            organization: true,
            description: true,
            skills: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })
        .catch(() => []),
      prisma.researchSession
        .findMany({
          where: { userId },
          select: { title: true, notes: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        })
        .catch(() => []),
      prisma.studentProfile
        .findUnique({
          where: { userId },
          select: { topConceptsThisWeek: true },
        })
        .catch(() => null),
    ])

  // Group memories
  const memoryByCategory: Record<string, string[]> = {}
  for (const m of memories) {
    if (!memoryByCategory[m.category]) memoryByCategory[m.category] = []
    memoryByCategory[m.category].push(m.content)
  }

  // Build portfolio buckets
  const portfolio: LinkedInPreflight['portfolio'] = {
    experiences: [],
    projects: [],
    publications: [],
    certifications: [],
    awards: [],
  }
  for (const item of portfolioItems) {
    const base = {
      title: item.title,
      organization: item.organization,
      description: item.description,
      skills: item.skills,
    }
    switch (item.type) {
      case 'EXPERIENCE':
        portfolio.experiences.push(base)
        break
      case 'PROJECT':
        portfolio.projects.push(base)
        break
      case 'PUBLICATION':
        portfolio.publications.push(base)
        break
      case 'CERTIFICATION':
        portfolio.certifications.push(base)
        break
      case 'AWARD':
        portfolio.awards.push(base)
        break
    }
  }

  // Derive keywords from all skill arrays
  const skillFrequency: Record<string, number> = {}
  for (const item of portfolioItems) {
    for (const skill of item.skills) {
      const normalized = skill.trim()
      if (normalized) {
        skillFrequency[normalized] = (skillFrequency[normalized] ?? 0) + 1
      }
    }
  }
  // Add interest tags with weight 1
  for (const i of interests) {
    const tag = i.tag.trim()
    if (tag) skillFrequency[tag] = (skillFrequency[tag] ?? 0) + 1
  }

  // Top 10 keywords sorted by frequency
  const derivedKeywords = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill)

  return {
    user: { ...user, role: user.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN' },
    memories: {
      goals: memoryByCategory['GOALS'] ?? [],
      strengths: memoryByCategory['STRENGTHS'] ?? [],
      projects: memoryByCategory['PROJECTS'] ?? [],
      identity: memoryByCategory['IDENTITY'] ?? [],
      writingStyle: memoryByCategory['WRITING_STYLE']?.[0] ?? null,
    },
    interests: interests.map((i) => i.tag),
    courses: enrollments.map((e) => ({ code: e.course.courseCode, title: e.course.title })),
    portfolio,
    researchSessions: research.map((r) => ({ title: r.title, notes: r.notes })),
    topConcepts: profile?.topConceptsThisWeek ?? [],
    derivedKeywords,
    skillFrequency,
  }
}
