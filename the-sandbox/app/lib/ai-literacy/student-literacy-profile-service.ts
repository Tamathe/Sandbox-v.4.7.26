// ── Student AI Literacy Profile — Scoring Engine ───────────────────────────
// Scores students across 4 dimensions as they complete Student AI Literacy
// modules. The profile "materializes" once 2+ modules are completed.
// Mirrors the educator progressive-profile-service.ts pattern.

import { prisma } from '../prisma'
import type { DisciplineFamily, StudentLiteracyProfile } from '../../generated/prisma'

// ── Discipline Inference ──────────────────────────────────────────────────

const DISCIPLINE_MAP: Record<string, DisciplineFamily> = {
  BIO: 'STEM', CHE: 'STEM', PHY: 'STEM', MAT: 'STEM', CS: 'STEM',
  STA: 'STEM', EGR: 'STEM',
  ENG: 'HUMANITIES', HIS: 'HUMANITIES', PHI: 'HUMANITIES', CLA: 'HUMANITIES',
  PSY: 'SOCIAL_SCIENCES', SOC: 'SOCIAL_SCIENCES', POL: 'SOCIAL_SCIENCES',
  ECO: 'SOCIAL_SCIENCES',
  ART: 'ARTS', MUS: 'ARTS', THE: 'ARTS', DMA: 'ARTS',
  BUS: 'PROFESSIONAL', ACC: 'PROFESSIONAL', FIN: 'PROFESSIONAL',
  MGT: 'PROFESSIONAL', MKT: 'PROFESSIONAL',
  NUR: 'HEALTH_SCIENCES', PHA: 'HEALTH_SCIENCES', MED: 'HEALTH_SCIENCES',
  KHP: 'HEALTH_SCIENCES', CSD: 'HEALTH_SCIENCES',
}

export async function inferDisciplineFromCourses(
  userId: string,
): Promise<DisciplineFamily | null> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: { course: { select: { courseCode: true } } },
  })

  // Count occurrences of each discipline family
  const counts: Partial<Record<DisciplineFamily, number>> = {}
  for (const enrollment of enrollments) {
    const prefix = enrollment.course.courseCode.replace(/[^A-Z]/gi, '').toUpperCase()
    for (const [code, family] of Object.entries(DISCIPLINE_MAP)) {
      if (prefix.startsWith(code)) {
        counts[family] = (counts[family] ?? 0) + 1
        break
      }
    }
  }

  // Return the most common family
  let best: DisciplineFamily | null = null
  let bestCount = 0
  for (const [family, count] of Object.entries(counts)) {
    if (count > bestCount) {
      best = family as DisciplineFamily
      bestCount = count
    }
  }
  return best
}

// ── Readiness Band ────────────────────────────────────────────────────────

export function getStudentReadinessBand(score: number): {
  label: string
  key: string
} {
  if (score <= 25) return { label: 'Getting Started', key: 'getting-started' }
  if (score <= 50) return { label: 'Building Skills', key: 'building-skills' }
  if (score <= 75) return { label: 'Growing Confidence', key: 'growing-confidence' }
  return { label: 'AI Ready', key: 'ai-ready' }
}

// ── Get or Create ─────────────────────────────────────────────────────────

export async function getOrCreateProfile(userId: string): Promise<StudentLiteracyProfile> {
  return prisma.studentLiteracyProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}

// ── Signal Helpers ────────────────────────────────────────────────────────

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function clamp(v: number): number {
  return Math.round(Math.min(100, Math.max(0, v)))
}

function blend(signals: (number | null)[], weights?: number[]): number | null {
  const active: { value: number; weight: number }[] = []
  for (let i = 0; i < signals.length; i++) {
    if (signals[i] !== null) {
      active.push({ value: signals[i]!, weight: weights?.[i] ?? 1 })
    }
  }
  if (active.length === 0) return null
  const totalWeight = active.reduce((s, a) => s + a.weight, 0)
  return active.reduce((s, a) => s + a.value * (a.weight / totalWeight), 0)
}

// ── Recalculate ───────────────────────────────────────────────────────────

export async function recalculateStudentProfile(userId: string) {
  const profile = await getOrCreateProfile(userId)

  // Gather all signals in parallel
  const [
    promptLabAttempts,
    outputEvalAttempts,
    judgmentCallAttempts,
    clarityCheckResponses,
    studyCoachSessions,
  ] = await Promise.all([
    prisma.promptLabAttempt.findMany({
      where: { userId, context: 'student' },
      select: { overallScore: true, scores: true },
    }),
    prisma.outputEvalAttempt.findMany({
      where: { userId, context: 'student' },
      select: { detectionScore: true, overallScore: true },
    }),
    prisma.judgmentCallAttempt.findMany({
      where: { userId },
      select: { ethicalScore: true, judgmentScore: true },
    }),
    prisma.clarityCheckResponse.findMany({
      where: { userId },
      select: { score: true },
    }),
    prisma.studyCoachSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: { overallScore: true, techniqueScores: true },
    }),
  ])

  // ── Practical Skill signals ──────────────────────────────────────────
  // Signal 1: PromptLabAttempt avg overallScore (already 0-100)
  const promptLabAvg = avg(promptLabAttempts.map((a) => a.overallScore))
  // Signal 2: StudyCoachSession avg overallScore
  const coachOverallAvg = avg(
    studyCoachSessions.filter((s) => s.overallScore != null).map((s) => s.overallScore!),
  )
  const practicalSkillSignal = blend([promptLabAvg, coachOverallAvg], [2, 1])

  // ── Communication signals ────────────────────────────────────────────
  // Signal 1: PromptLabAttempt clarity + specificity from scores JSON
  const clarityScores: number[] = []
  for (const attempt of promptLabAttempts) {
    const scores = attempt.scores as Record<string, number> | null
    if (scores) {
      // clarity and specificity are typically 1-10 scale in scores JSON
      const clarity = scores.clarity ?? scores.Clarity
      const specificity = scores.specificity ?? scores.Specificity
      if (typeof clarity === 'number') clarityScores.push(clarity * 10)
      if (typeof specificity === 'number') clarityScores.push(specificity * 10)
    }
  }
  const communicationFromPrompt = avg(clarityScores)
  // Signal 2: StudyCoachSession contextProvision from techniqueScores
  const contextProvisionScores: number[] = []
  for (const session of studyCoachSessions) {
    const ts = session.techniqueScores as Record<string, number> | null
    if (ts?.contextProvision != null) contextProvisionScores.push(ts.contextProvision)
  }
  const communicationFromCoach = avg(contextProvisionScores)
  const communicationSignal = blend([communicationFromPrompt, communicationFromCoach], [2, 1])

  // ── Skepticism signals ───────────────────────────────────────────────
  // Signal 1: OutputEvalAttempt avg detectionScore
  const detectionAvg = avg(outputEvalAttempts.map((a) => a.detectionScore))
  // Signal 2: JudgmentCallAttempt avg ethicalScore
  const ethicalAvg = avg(judgmentCallAttempts.map((a) => a.ethicalScore))
  const skepticismSignal = blend([detectionAvg, ethicalAvg], [2, 1])

  // ── Judgment signals ─────────────────────────────────────────────────
  // Signal 1: ClarityCheckResponse avg score
  const clarityCheckAvg = avg(clarityCheckResponses.map((r) => r.score))
  // Signal 2: JudgmentCallAttempt avg judgmentScore
  const judgmentAvg = avg(judgmentCallAttempts.map((a) => a.judgmentScore))
  const judgmentSignal = blend([clarityCheckAvg, judgmentAvg], [1, 2])

  // ── Final dimension values ───────────────────────────────────────────
  // If no module data exists for a dimension, preserve onboarding-seeded values
  const practicalSkill = clamp(practicalSkillSignal ?? profile.practicalSkill)
  const communication = clamp(communicationSignal ?? profile.communication)
  const skepticism = clamp(skepticismSignal ?? profile.skepticism)
  const judgment = clamp(judgmentSignal ?? profile.judgment)
  const readiness = Math.round((practicalSkill + communication + skepticism + judgment) / 4)

  // ── Module completion count ──────────────────────────────────────────
  // A module is "completed" if the student has at least 1 attempt/session in it
  let modulesCompleted = 0
  if (promptLabAttempts.length > 0) modulesCompleted++  // Prompt Craft
  if (outputEvalAttempts.length > 0) modulesCompleted++ // Output Detective
  if (judgmentCallAttempts.length > 0) modulesCompleted++ // Judgment Calls
  if (studyCoachSessions.length > 0) modulesCompleted++ // AI Study Coach
  if (clarityCheckResponses.length > 0) modulesCompleted++ // My AI Policies (clarity check)

  const profileMaterialized = modulesCompleted >= 2

  const updated = await prisma.studentLiteracyProfile.update({
    where: { userId },
    data: {
      practicalSkill,
      communication,
      skepticism,
      judgment,
      readiness,
      modulesCompleted,
      profileMaterialized,
      ...(profileMaterialized ? { lastScoredAt: new Date() } : {}),
    },
  })

  return {
    profile: updated,
    materialized: profileMaterialized,
    readinessBand: getStudentReadinessBand(readiness),
  }
}
