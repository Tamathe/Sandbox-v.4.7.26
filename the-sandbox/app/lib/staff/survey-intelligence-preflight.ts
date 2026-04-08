/**
 * Survey Intelligence — Preflight
 *
 * Aggregates user context and project stats before page render
 * so Sandy never re-asks known info.
 */

import { prisma } from '../prisma'

export interface SurveyIntelligencePreflight {
  user: {
    id: string
    name: string
    email: string
    role: string
    department: string | null
    college: string | null
  }
  projectCount: number
  vaultDocCount: number
  recentProjects: { id: string; title: string; status: string; questionCount: number }[]
}

export async function getSurveyIntelligencePreflight(userId: string): Promise<SurveyIntelligencePreflight> {
  const [user, projectCount, vaultDocCount, recentProjects] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, department: true, college: true },
    }),
    prisma.surveyProject.count({ where: { creatorId: userId } }),
    prisma.surveyVaultDocument.count({ where: { isActive: true } }),
    prisma.surveyProject.findMany({
      where: { creatorId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { questions: true } },
      },
    }),
  ])

  return {
    user: { ...user, role: user.role as string },
    projectCount,
    vaultDocCount,
    recentProjects: recentProjects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      questionCount: p._count.questions,
    })),
  }
}
