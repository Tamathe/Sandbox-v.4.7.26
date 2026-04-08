/**
 * cover-letter-preflight.ts
 *
 * Aggregates user profile data for the Cover Letter Generator's
 * Smart Preloading (Beat 0). All queries run in Promise.all for <300ms.
 */

import { prisma } from './prisma'

export interface CoverLetterPreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    bio: string | null
    personalContext: string | null
  }
  goals: string[]
  strengths: string[]
  projects: string[]
  writingStyle: string | null
  interests: string[]
  courses: { code: string; title: string }[]
  portfolio: {
    experiences: { title: string; organization: string | null; description: string | null; skills: string[] }[]
    projects: { title: string; description: string | null; skills: string[] }[]
  }
  researchSessions: { title: string; notes: string | null }[]
  topConcepts: string[]
}

export async function getCoverLetterPreflight(userId: string): Promise<CoverLetterPreflight> {
  const [user, memories, interests, enrollments, portfolioItems, research, profile] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true, email: true, department: true, college: true, bio: true, personalContext: true },
      }),
      prisma.userMemory.findMany({
        where: { userId, category: { in: ['GOALS', 'STRENGTHS', 'PROJECTS', 'WRITING_STYLE'] } },
        select: { category: true, content: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.userInterest.findMany({
        where: { userId, accepted: true },
        select: { tag: true },
        take: 10,
      }),
      prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        include: { course: { select: { courseCode: true, title: true } } },
        take: 10,
      }),
      prisma.portfolioItem.findMany({
        where: { userId, type: { in: ['EXPERIENCE', 'PROJECT'] } },
        select: { type: true, title: true, organization: true, description: true, skills: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.researchSession.findMany({
        where: { userId },
        select: { title: true, notes: true },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      prisma.studentProfile.findUnique({
        where: { userId },
        select: { topConceptsThisWeek: true },
      }),
    ])

  // Group memories by category
  const memoryByCategory: Record<string, string[]> = {}
  for (const m of memories) {
    if (!memoryByCategory[m.category]) memoryByCategory[m.category] = []
    memoryByCategory[m.category].push(m.content)
  }

  return {
    user,
    goals: memoryByCategory['GOALS'] ?? [],
    strengths: memoryByCategory['STRENGTHS'] ?? [],
    projects: memoryByCategory['PROJECTS'] ?? [],
    writingStyle: memoryByCategory['WRITING_STYLE']?.[0] ?? null,
    interests: interests.map((i: { tag: string }) => i.tag),
    courses: enrollments.map((e: { course: { courseCode: string; title: string } }) => ({ code: e.course.courseCode, title: e.course.title })),
    portfolio: {
      experiences: portfolioItems
        .filter((p: { type: string }) => p.type === 'EXPERIENCE')
        .map((p: { title: string; organization: string | null; description: string | null; skills: string[] }) => ({ title: p.title, organization: p.organization, description: p.description, skills: p.skills })),
      projects: portfolioItems
        .filter((p: { type: string }) => p.type === 'PROJECT')
        .map((p: { title: string; description: string | null; skills: string[] }) => ({ title: p.title, description: p.description, skills: p.skills })),
    },
    researchSessions: research.map((r: { title: string; notes: string | null }) => ({ title: r.title, notes: r.notes })),
    topConcepts: profile?.topConceptsThisWeek ?? [],
  }
}
