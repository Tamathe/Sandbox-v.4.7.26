/**
 * Living Case Studies — faculty submit anonymized teaching experiences.
 * Admin/DUS review and approve for display in the Pedagogy Hub.
 */

import { prisma } from '../prisma'
import type { CaseStudyStatus } from '../../generated/prisma'

export interface CaseStudyInput {
  discipline: string
  stanceRange?: string
  title: string
  challenge: string
  approach: string
  outcome: string
  lessonsLearned: string[]
}

export async function submitCaseStudy(userId: string, input: CaseStudyInput) {
  return prisma.caseStudySubmission.create({
    data: {
      userId,
      discipline: input.discipline,
      stanceRange: input.stanceRange ?? null,
      title: input.title,
      challenge: input.challenge,
      approach: input.approach,
      outcome: input.outcome,
      lessonsLearned: input.lessonsLearned,
    },
  })
}

export async function getApprovedCaseStudies(discipline?: string) {
  return prisma.caseStudySubmission.findMany({
    where: {
      status: 'APPROVED',
      ...(discipline ? { discipline } : {}),
    },
    select: {
      id: true,
      discipline: true,
      stanceRange: true,
      title: true,
      challenge: true,
      approach: true,
      outcome: true,
      lessonsLearned: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPendingCaseStudies() {
  return prisma.caseStudySubmission.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { name: true, department: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function reviewCaseStudy(
  id: string,
  reviewerId: string,
  status: 'APPROVED' | 'REJECTED',
) {
  return prisma.caseStudySubmission.update({
    where: { id },
    data: {
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  })
}
