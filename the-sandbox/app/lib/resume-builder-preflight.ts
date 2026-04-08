/**
 * resume-builder-preflight.ts
 *
 * Heaviest Write Room preflight — aggregates full professional identity
 * for resume generation. Reuses the same data sources as LinkedIn Optimizer
 * plus career mapping for suggested roles/skills.
 */

import { prisma } from './prisma'

export interface ResumeBuilderPreflight {
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
  topConcepts: string[]
  derivedKeywords: string[]
  suggestedRoles: string[]
}

// ── Department → career role mapping ───────────────────────────────────────

const DEPARTMENT_CAREER_MAP: Record<string, string[]> = {
  'Computer Science': ['Software Engineering Intern', 'Data Science Intern', 'ML Research Assistant', 'Full-Stack Developer'],
  Biology: ['Research Assistant', 'Lab Technician', 'Clinical Research Coordinator', 'Biotech Intern'],
  Business: ['Business Analyst Intern', 'Marketing Coordinator', 'Financial Analyst Intern', 'Consulting Intern'],
  Law: ['Legal Intern', 'Judicial Extern', 'Policy Analyst', 'Compliance Associate'],
  Engineering: ['Engineering Intern', 'Project Engineer', 'Technical Consultant', 'Design Engineer'],
  Education: ['Student Teacher', 'Curriculum Development Intern', 'EdTech Associate', 'Program Assistant'],
  Nursing: ['Nurse Extern', 'Patient Care Technician', 'Health Research Assistant', 'Community Health Worker'],
  _default: ['Research Assistant', 'Program Intern', 'Teaching Assistant', 'Project Coordinator'],
}

export async function getResumeBuilderPreflight(userId: string): Promise<ResumeBuilderPreflight> {
  const [user, memories, interests, enrollments, portfolioItems, profile] = await Promise.all([
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
  const portfolio: ResumeBuilderPreflight['portfolio'] = {
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

  // Derive keywords from skills
  const skillFreq: Record<string, number> = {}
  for (const item of portfolioItems) {
    for (const skill of item.skills) {
      const normalized = skill.trim()
      if (normalized) skillFreq[normalized] = (skillFreq[normalized] ?? 0) + 1
    }
  }
  for (const i of interests) {
    const tag = i.tag.trim()
    if (tag) skillFreq[tag] = (skillFreq[tag] ?? 0) + 1
  }
  const derivedKeywords = Object.entries(skillFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill)

  // Suggested roles from department
  const dept = user.department ?? '_default'
  const suggestedRoles = DEPARTMENT_CAREER_MAP[dept] ?? DEPARTMENT_CAREER_MAP._default

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
    topConcepts: profile?.topConceptsThisWeek ?? [],
    derivedKeywords,
    suggestedRoles,
  }
}
