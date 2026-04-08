// ─── Virtual Clinic — Analytics Service ─────────────────────────────────────

import { prisma } from '../prisma'
import type { CompetencyLevel, EncounterScores, CognitiveBias } from './types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StudentGrowthEncounter {
  encounterId: string
  caseTitle: string
  difficulty: string
  overallScore: number
  overallLevel: CompetencyLevel
  domainScores: {
    history: number
    exam: number
    differential: number
    plan: number
    communication: number
  }
  biasCount: number
  completedAt: string
}

export interface StudentGrowthData {
  encounters: StudentGrowthEncounter[]
  rollingAverage: number | null
  trend: 'improving' | 'declining' | 'stable'
  strongestDomain: string | null
  weakestDomain: string | null
  domainAverages: {
    history: number
    exam: number
    differential: number
    plan: number
    communication: number
  }
}

export interface CaseAnalyticsData {
  totalStarted: number
  totalCompleted: number
  completionRate: number
  averageScore: number | null
  scoreDistribution: Record<CompetencyLevel, number>
  averageTimeMinutes: number | null
  domainAverages: {
    history: number
    exam: number
    differential: number
    plan: number
    communication: number
  }
  commonBiases: { type: string; count: number }[]
}

export interface CohortComparisonData {
  studentAverage: number | null
  classAverage: number | null
  studentDomains: {
    history: number
    exam: number
    differential: number
    plan: number
    communication: number
  }
  classDomains: {
    history: number
    exam: number
    differential: number
    plan: number
    communication: number
  }
  studentEncounterCount: number
  classAverageEncounterCount: number
  percentileRank: number | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DOMAIN_KEYS = ['history', 'exam', 'differential', 'plan', 'communication'] as const

function extractDomainScores(scores: unknown): { history: number; exam: number; differential: number; plan: number; communication: number } {
  const s = scores as EncounterScores | null
  return {
    history: s?.history?.score ?? 0,
    exam: s?.exam?.score ?? 0,
    differential: s?.differential?.score ?? 0,
    plan: s?.plan?.score ?? 0,
    communication: s?.communication?.score ?? 0,
  }
}

function averageDomains(
  encounters: { scores: unknown }[],
): { history: number; exam: number; differential: number; plan: number; communication: number } {
  if (encounters.length === 0) return { history: 0, exam: 0, differential: 0, plan: 0, communication: 0 }
  const sums = { history: 0, exam: 0, differential: 0, plan: 0, communication: 0 }
  for (const e of encounters) {
    const d = extractDomainScores(e.scores)
    for (const k of DOMAIN_KEYS) sums[k] += d[k]
  }
  const n = encounters.length
  return {
    history: Math.round((sums.history / n) * 100) / 100,
    exam: Math.round((sums.exam / n) * 100) / 100,
    differential: Math.round((sums.differential / n) * 100) / 100,
    plan: Math.round((sums.plan / n) * 100) / 100,
    communication: Math.round((sums.communication / n) * 100) / 100,
  }
}

// ─── getStudentGrowth ───────────────────────────────────────────────────────

export async function getStudentGrowth(userId: string): Promise<StudentGrowthData> {
  const encounters = await prisma.clinicalEncounter.findMany({
    where: { userId, completedAt: { not: null }, overallScore: { not: null } },
    include: { clinicalCase: { select: { title: true, difficulty: true } } },
    orderBy: { completedAt: 'asc' },
  })

  const mapped: StudentGrowthEncounter[] = encounters.map((e) => ({
    encounterId: e.id,
    caseTitle: e.clinicalCase.title,
    difficulty: e.clinicalCase.difficulty,
    overallScore: e.overallScore!,
    overallLevel: (e.overallLevel as CompetencyLevel) ?? 'NOVICE',
    domainScores: extractDomainScores(e.scores),
    biasCount: Array.isArray(e.cognitiveBiases) ? (e.cognitiveBiases as unknown as CognitiveBias[]).length : 0,
    completedAt: e.completedAt!.toISOString(),
  }))

  // Rolling average (last 5)
  const last5 = mapped.slice(-5)
  const rollingAverage =
    last5.length > 0
      ? Math.round((last5.reduce((sum, e) => sum + e.overallScore, 0) / last5.length) * 100) / 100
      : null

  // Trend: compare first-half average vs second-half average
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (mapped.length >= 4) {
    const mid = Math.floor(mapped.length / 2)
    const firstHalf = mapped.slice(0, mid)
    const secondHalf = mapped.slice(mid)
    const firstAvg = firstHalf.reduce((s, e) => s + e.overallScore, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, e) => s + e.overallScore, 0) / secondHalf.length
    const diff = secondAvg - firstAvg
    if (diff > 3) trend = 'improving'
    else if (diff < -3) trend = 'declining'
  }

  // Domain averages
  const domainAverages = averageDomains(encounters)

  // Strongest / weakest
  let strongestDomain: string | null = null
  let weakestDomain: string | null = null
  if (mapped.length > 0) {
    let maxVal = -1
    let minVal = 101
    for (const k of DOMAIN_KEYS) {
      if (domainAverages[k] > maxVal) { maxVal = domainAverages[k]; strongestDomain = k }
      if (domainAverages[k] < minVal) { minVal = domainAverages[k]; weakestDomain = k }
    }
  }

  return { encounters: mapped, rollingAverage, trend, strongestDomain, weakestDomain, domainAverages }
}

// ─── getCaseAnalytics ───────────────────────────────────────────────────────

export async function getCaseAnalytics(caseId: string, creatorId: string): Promise<CaseAnalyticsData> {
  // Ownership check
  const clinicalCase = await prisma.clinicalCase.findUnique({
    where: { id: caseId },
    select: { creatorId: true },
  })
  if (!clinicalCase) {
    const err = new Error('Case not found') as Error & { status: number }
    err.status = 404
    throw err
  }

  // Check ownership — creator or admin is checked at the route level
  const user = await prisma.user.findUnique({ where: { id: creatorId }, select: { role: true } })
  if (clinicalCase.creatorId !== creatorId && user?.role !== 'ADMIN') {
    const err = new Error('Not authorized to view analytics for this case') as Error & { status: number }
    err.status = 403
    throw err
  }

  const allEncounters = await prisma.clinicalEncounter.findMany({
    where: { caseId },
    select: {
      id: true,
      completedAt: true,
      startedAt: true,
      overallScore: true,
      overallLevel: true,
      scores: true,
      cognitiveBiases: true,
    },
  })

  const totalStarted = allEncounters.length
  const completed = allEncounters.filter((e) => e.completedAt !== null)
  const totalCompleted = completed.length
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0

  // Scored encounters
  const scored = completed.filter((e) => e.overallScore !== null)

  const averageScore =
    scored.length > 0
      ? Math.round((scored.reduce((s, e) => s + e.overallScore!, 0) / scored.length) * 100) / 100
      : null

  // Score distribution
  const scoreDistribution: Record<CompetencyLevel, number> = {
    NOVICE: 0,
    DEVELOPING: 0,
    COMPETENT: 0,
    PROFICIENT: 0,
  }
  for (const e of scored) {
    const level = (e.overallLevel as CompetencyLevel) ?? 'NOVICE'
    scoreDistribution[level]++
  }

  // Average time
  let averageTimeMinutes: number | null = null
  if (completed.length > 0) {
    const totalMs = completed.reduce((s, e) => {
      return s + (e.completedAt!.getTime() - e.startedAt.getTime())
    }, 0)
    averageTimeMinutes = Math.round(totalMs / completed.length / 60000)
  }

  // Domain averages
  const domainAverages = averageDomains(scored)

  // Common biases
  const biasCounts: Record<string, number> = {}
  for (const e of scored) {
    const biases = e.cognitiveBiases as unknown as CognitiveBias[] | null
    if (Array.isArray(biases)) {
      for (const b of biases) {
        biasCounts[b.type] = (biasCounts[b.type] ?? 0) + 1
      }
    }
  }
  const commonBiases = Object.entries(biasCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalStarted,
    totalCompleted,
    completionRate,
    averageScore,
    scoreDistribution,
    averageTimeMinutes,
    domainAverages,
    commonBiases,
  }
}

// ─── getCohortComparison ────────────────────────────────────────────────────

export async function getCohortComparison(courseId: string, userId: string): Promise<CohortComparisonData> {
  // Get all scored encounters for this course
  const courseEncounters = await prisma.clinicalEncounter.findMany({
    where: { courseId, completedAt: { not: null }, overallScore: { not: null } },
    select: { userId: true, overallScore: true, scores: true },
  })

  // Student's encounters
  const studentEncounters = courseEncounters.filter((e) => e.userId === userId)
  const studentEncounterCount = studentEncounters.length

  const studentAverage =
    studentEncounters.length > 0
      ? Math.round((studentEncounters.reduce((s, e) => s + e.overallScore!, 0) / studentEncounters.length) * 100) / 100
      : null

  const studentDomains = averageDomains(studentEncounters)

  // Class-wide (all students)
  const classAverage =
    courseEncounters.length > 0
      ? Math.round((courseEncounters.reduce((s, e) => s + e.overallScore!, 0) / courseEncounters.length) * 100) / 100
      : null

  const classDomains = averageDomains(courseEncounters)

  // Average encounter count per student
  const studentIds = new Set(courseEncounters.map((e) => e.userId))
  const classAverageEncounterCount =
    studentIds.size > 0 ? Math.round(courseEncounters.length / studentIds.size) : 0

  // Percentile rank
  let percentileRank: number | null = null
  if (studentAverage !== null && studentIds.size > 1) {
    // Compute per-student averages
    const perStudent: Record<string, { total: number; count: number }> = {}
    for (const e of courseEncounters) {
      if (!perStudent[e.userId]) perStudent[e.userId] = { total: 0, count: 0 }
      perStudent[e.userId].total += e.overallScore!
      perStudent[e.userId].count++
    }
    const studentAverages = Object.values(perStudent).map((v) => v.total / v.count)
    const below = studentAverages.filter((avg) => avg < studentAverage).length
    percentileRank = Math.round((below / studentAverages.length) * 100)
  }

  return {
    studentAverage,
    classAverage,
    studentDomains,
    classDomains,
    studentEncounterCount,
    classAverageEncounterCount,
    percentileRank,
  }
}

// ─── getRecommendedCase ────────────────────────────────────────────────────

export interface RecommendedCaseData {
  caseId: string
  title: string
  chiefComplaint: string
  difficulty: string
  organSystems: string[]
  patientName: string
  patientAge: number
  patientSex: string
  reason: string
}

export async function getRecommendedCase(userId: string): Promise<RecommendedCaseData | null> {
  // Find the student's most recent scored encounter
  const latestEncounter = await prisma.clinicalEncounter.findFirst({
    where: { userId, completedAt: { not: null }, overallScore: { not: null } },
    orderBy: { completedAt: 'desc' },
    select: { scores: true, caseId: true, clinicalCase: { select: { difficulty: true, organSystems: true } } },
  })

  if (!latestEncounter) return null

  // Find lowest-scoring domain from the most recent encounter
  const domainScores = extractDomainScores(latestEncounter.scores)
  let weakestDomain: typeof DOMAIN_KEYS[number] = DOMAIN_KEYS[0]
  let minScore = domainScores[weakestDomain]
  for (const k of DOMAIN_KEYS) {
    if (domainScores[k] < minScore) {
      minScore = domainScores[k]
      weakestDomain = k
    }
  }

  // Find case IDs where this student already scored PROFICIENT
  const proficientCaseIds = await prisma.clinicalEncounter.findMany({
    where: { userId, completedAt: { not: null }, overallLevel: 'PROFICIENT' },
    select: { caseId: true },
    distinct: ['caseId'],
  })
  const excludeIds = new Set(proficientCaseIds.map((e) => e.caseId))

  // Map organ systems from the latest case to find similar cases
  const organSystems = latestEncounter.clinicalCase.organSystems
  const difficultyOrder = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
  const currentIdx = difficultyOrder.indexOf(latestEncounter.clinicalCase.difficulty)

  // Query published cases at same or lower difficulty, overlapping organ systems
  const candidates = await prisma.clinicalCase.findMany({
    where: {
      published: true,
      organSystems: { hasSome: organSystems },
      id: { not: latestEncounter.caseId },
    },
    select: {
      id: true,
      title: true,
      chiefComplaint: true,
      difficulty: true,
      organSystems: true,
      patientName: true,
      patientAge: true,
      patientSex: true,
    },
  })

  // Filter: exclude proficient cases and cases harder than current
  const filtered = candidates.filter((c) => {
    if (excludeIds.has(c.id)) return false
    const cIdx = difficultyOrder.indexOf(c.difficulty)
    return cIdx <= currentIdx
  })

  if (filtered.length === 0) return null

  // Pick the first matching case (could randomize later)
  const pick = filtered[0]

  const DOMAIN_LABELS: Record<string, string> = {
    history: 'History Taking',
    exam: 'Physical Exam',
    differential: 'Differential Diagnosis',
    plan: 'Diagnostic Plan',
    communication: 'Communication',
  }

  return {
    caseId: pick.id,
    title: pick.title,
    chiefComplaint: pick.chiefComplaint,
    difficulty: pick.difficulty,
    organSystems: pick.organSystems,
    patientName: pick.patientName,
    patientAge: pick.patientAge,
    patientSex: pick.patientSex,
    reason: `Your ${DOMAIN_LABELS[weakestDomain]} score was ${Math.round(minScore)}/100. This case targets similar organ systems to help you improve.`,
  }
}
