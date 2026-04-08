import { prisma } from './prisma'
import type { AIStance, DisciplineFamily, AILiteracyProfile, StanceHistory } from '../generated/prisma'

// Import from stance-constants for local use AND re-export for consumers
import { STANCE_DETAILS, STANCE_QUESTIONS, computeScore } from './stance-constants'
export { STANCE_DETAILS, STANCE_QUESTIONS, computeScore }
export type { StanceDetail, StanceQuestion } from './stance-constants'

// ── Scoring ──────────────────────────────────────────────────────────────────

export function scoreToStance(score: number): AIStance {
  if (score <= 1.8) return 'PROHIBIT'
  if (score <= 2.5) return 'CAUTIOUS'
  if (score <= 3.4) return 'GUIDED'
  if (score <= 4.2) return 'INTEGRATE'
  return 'REQUIRE'
}

// ── Profile Operations ───────────────────────────────────────────────────────

export async function getOrCreateProfile(userId: string): Promise<AILiteracyProfile> {
  const existing = await prisma.aILiteracyProfile.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.aILiteracyProfile.create({ data: { userId } })
}

export async function getStanceProfile(userId: string) {
  const profile = await prisma.aILiteracyProfile.findUnique({ where: { userId } })
  const historyCount = await prisma.stanceHistory.count({ where: { userId } })
  return {
    stance: profile?.stance ?? null,
    score: null as number | null,
    stanceUpdatedAt: profile?.stanceUpdatedAt ?? null,
    stanceRationale: profile?.stanceRationale ?? null,
    disciplineFamily: profile?.disciplineFamily ?? null,
    hasCompletedAssessment: !!profile?.stance,
    historyCount,
  }
}

export interface SubmitAssessmentInput {
  responses: { questionId: string; selectedValue: number; optionLabel: string }[]
  disciplineFamily?: DisciplineFamily
  reflectionNote?: string
}

export async function submitAssessment(userId: string, input: SubmitAssessmentInput) {
  const score = computeScore(input.responses)
  const stance = scoreToStance(score)

  // Get current profile for previousStance
  const currentProfile = await prisma.aILiteracyProfile.findUnique({ where: { userId } })
  const previousStance = currentProfile?.stance ?? null

  // Save history entry
  await prisma.stanceHistory.create({
    data: {
      userId,
      previousStance,
      newStance: stance,
      score,
      responses: input.responses,
      reflectionNote: input.reflectionNote ?? null,
    },
  })

  // Upsert profile
  await prisma.aILiteracyProfile.upsert({
    where: { userId },
    create: {
      userId,
      stance,
      stanceUpdatedAt: new Date(),
      stanceRationale: input.reflectionNote ?? null,
      disciplineFamily: input.disciplineFamily ?? null,
    },
    update: {
      stance,
      stanceUpdatedAt: new Date(),
      stanceRationale: input.reflectionNote ?? null,
      ...(input.disciplineFamily ? { disciplineFamily: input.disciplineFamily } : {}),
    },
  })

  // Build per-question breakdown
  const breakdown: Record<string, number> = {}
  for (const r of input.responses) {
    breakdown[r.questionId] = r.selectedValue
  }

  return {
    stance,
    score,
    breakdown,
    stanceDetail: STANCE_DETAILS[stance],
  }
}

export async function updateStanceManually(
  userId: string,
  stance: AIStance,
  rationale?: string,
) {
  const currentProfile = await prisma.aILiteracyProfile.findUnique({ where: { userId } })
  const previousStance = currentProfile?.stance ?? null

  await prisma.stanceHistory.create({
    data: {
      userId,
      previousStance,
      newStance: stance,
      score: 0, // manual selection — no score
      responses: [],
      reflectionNote: rationale ?? 'Manual stance selection',
    },
  })

  await prisma.aILiteracyProfile.upsert({
    where: { userId },
    create: {
      userId,
      stance,
      stanceUpdatedAt: new Date(),
      stanceRationale: rationale ?? null,
    },
    update: {
      stance,
      stanceUpdatedAt: new Date(),
      stanceRationale: rationale ?? null,
    },
  })
}

// ── Peer Distribution ────────────────────────────────────────────────────────

const MIN_GROUP_SIZE = 10

export async function getStanceDistribution(disciplineFamily?: DisciplineFamily) {
  // Overall distribution
  const allProfiles = await prisma.aILiteracyProfile.groupBy({
    by: ['stance'],
    _count: { stance: true },
    where: { stance: { not: null } },
  })

  const total = allProfiles.reduce((sum, p) => sum + p._count.stance, 0)
  const distribution: Record<string, number> = {
    PROHIBIT: 0, CAUTIOUS: 0, GUIDED: 0, INTEGRATE: 0, REQUIRE: 0,
  }
  for (const p of allProfiles) {
    if (p.stance) distribution[p.stance] = p._count.stance
  }

  // Filtered by discipline
  let filtered = null
  if (disciplineFamily) {
    const filteredProfiles = await prisma.aILiteracyProfile.groupBy({
      by: ['stance'],
      _count: { stance: true },
      where: { stance: { not: null }, disciplineFamily },
    })
    const filteredTotal = filteredProfiles.reduce((sum, p) => sum + p._count.stance, 0)

    if (filteredTotal >= MIN_GROUP_SIZE) {
      const filteredDist: Record<string, number> = {
        PROHIBIT: 0, CAUTIOUS: 0, GUIDED: 0, INTEGRATE: 0, REQUIRE: 0,
      }
      for (const p of filteredProfiles) {
        if (p.stance) filteredDist[p.stance] = p._count.stance
      }
      filtered = {
        label: disciplineFamily.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        total: filteredTotal,
        distribution: filteredDist,
      }
    }
  }

  return {
    total,
    distribution,
    filtered,
    sufficientData: total >= MIN_GROUP_SIZE,
  }
}

// ── Stance History ───────────────────────────────────────────────────────────

export async function getStanceHistory(userId: string): Promise<StanceHistory[]> {
  return prisma.stanceHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

// ── Course Impact Analysis ───────────────────────────────────────────────────

type AIRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface AssignmentRisk {
  id: string
  title: string
  category: string | null
  aiRisk: AIRisk
  riskReason: string
}

interface CourseImpact {
  courseId: string
  courseCode: string
  title: string
  hasAIPolicy: boolean
  assignments: AssignmentRisk[]
  flaggedCount: number
  totalAssignments: number
}

function assessAssignmentRisk(
  assignment: { title: string; category: string | null; type: string },
  stance: AIStance,
): { risk: AIRisk; reason: string } {
  const cat = (assignment.category ?? '').toLowerCase()
  const title = assignment.title.toLowerCase()
  const type = assignment.type

  // In-class/proctored = always low
  if (cat.includes('exam') || cat.includes('quiz') || cat.includes('midterm') || cat.includes('final')) {
    if (title.includes('take-home') || title.includes('take home')) {
      return { risk: 'HIGH', reason: 'Take-home exam format is highly AI-completable' }
    }
    return { risk: 'LOW', reason: 'In-class/proctored assessment' }
  }

  if (cat.includes('presentation') || cat.includes('lab') || cat.includes('discussion')) {
    return { risk: 'LOW', reason: 'Embodied or interactive format' }
  }

  // For INTEGRATE/REQUIRE stances, AI use is expected so "risk" is lower
  if (stance === 'INTEGRATE' || stance === 'REQUIRE') {
    if (type === 'AI_EXPERIENCE') return { risk: 'LOW', reason: 'AI-integrated assignment' }
    return { risk: 'LOW', reason: 'AI use is part of your pedagogical approach' }
  }

  // Essays, papers, homework are the vulnerable ones
  if (cat.includes('paper') || cat.includes('essay') || title.includes('essay') || title.includes('paper') || title.includes('research')) {
    return { risk: 'HIGH', reason: 'Written assignment format is highly AI-completable' }
  }

  if (cat.includes('homework') || cat.includes('problem')) {
    return { risk: 'MEDIUM', reason: 'Problem-set format has moderate AI vulnerability' }
  }

  if (cat.includes('project')) {
    return { risk: 'MEDIUM', reason: 'Project format — depends on deliverable type' }
  }

  // Default
  return { risk: 'MEDIUM', reason: 'Review this assignment for AI vulnerability' }
}

export async function getCourseImpact(userId: string, stance: AIStance): Promise<CourseImpact[]> {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    include: {
      assignments: { select: { id: true, title: true, category: true, type: true } },
      courseAIPolicy: { select: { id: true } },
    },
  })

  return courses.map(course => {
    const assignments: AssignmentRisk[] = course.assignments.map(a => {
      const { risk, reason } = assessAssignmentRisk(a, stance)
      return {
        id: a.id,
        title: a.title,
        category: a.category,
        aiRisk: risk,
        riskReason: reason,
      }
    })

    const flaggedCount = assignments.filter(a => a.aiRisk === 'HIGH' || a.aiRisk === 'CRITICAL').length

    return {
      courseId: course.id,
      courseCode: course.courseCode,
      title: course.title,
      hasAIPolicy: !!course.courseAIPolicy,
      assignments,
      flaggedCount,
      totalAssignments: course.assignments.length,
    }
  })
}
