// ── Progressive AI Profile — Scoring Engine ──────────────────────────────────
// Silently scores users across 5 dimensions as they complete AI Literacy Hub
// modules. The profile "materializes" once 2+ modules are completed.

import { prisma } from './prisma'
import type { AILiteracyProfile, AIStance } from '../generated/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

type ModuleStatus = 'completed' | 'in-progress' | 'not-started'

// ── Readiness Band ───────────────────────────────────────────────────────────

export function getReadinessBand(score: number): { label: string; key: string } {
  if (score <= 25) return { label: 'Just Getting Started', key: 'starting' }
  if (score <= 50) return { label: 'Building Foundations', key: 'foundations' }
  if (score <= 75) return { label: 'Growing Confidence', key: 'confidence' }
  return { label: 'Leading the Way', key: 'leading' }
}

// ── Readiness Computation (pure — copied from ai-discovery-service.ts) ───────

function computeReadiness(dimensions: {
  comfort: number
  pedagogyAlignment: number
  curiosity: number
  ethicalAwareness: number
  currentUsage: number
}): number {
  const { comfort, curiosity, currentUsage, pedagogyAlignment, ethicalAwareness } = dimensions

  const weighted =
    comfort * 0.15 +
    curiosity * 0.20 +
    currentUsage * 0.15 +
    pedagogyAlignment * 0.25 +
    ethicalAwareness * 0.15

  // Nuance bonus: reward balanced profiles — low stddev across dimensions
  const dimValues = [comfort, curiosity, currentUsage, pedagogyAlignment, ethicalAwareness]
  const mean = dimValues.reduce((a, b) => a + b, 0) / dimValues.length
  const variance = dimValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / dimValues.length
  const stdDev = Math.sqrt(variance)
  // Max stddev for 0-100 range is ~44.7. Normalize to 0-10 bonus.
  const nuanceBonus = Math.max(0, 10 - stdDev / 4.47)

  return Math.round(Math.min(100, Math.max(0, weighted + nuanceBonus)))
}

// ── Stance → Dimension Base Maps ─────────────────────────────────────────────

const STANCE_PEDAGOGY_BASE: Record<string, number> = {
  PROHIBIT: 20,
  CAUTIOUS: 40,
  GUIDED: 60,
  INTEGRATE: 80,
  REQUIRE: 70,
}

const STANCE_ETHICS_BASE: Record<string, number> = {
  PROHIBIT: 80,
  CAUTIOUS: 70,
  GUIDED: 60,
  INTEGRATE: 50,
  REQUIRE: 40,
}

// ── Module Progress (server-side, replicates quick-start?view=progress) ──────

async function getModuleProgress(userId: string): Promise<{
  progress: Record<string, ModuleStatus>
  modulesCompleted: number
  modulesExplored: number
}> {
  const [profile, policiesCount, promptLabCount, outputEvalCount] = await Promise.all([
    prisma.aILiteracyProfile.findUnique({
      where: { userId },
      select: { stance: true, quickStartCompleted: true },
    }),
    prisma.courseAIPolicy.count({
      where: { course: { instructorId: userId } },
    }),
    prisma.promptLabAttempt.count({ where: { userId } }),
    prisma.outputEvalAttempt.count({ where: { userId } }),
  ])

  const progress: Record<string, ModuleStatus> = {
    stance: profile?.stance ? 'completed' : 'not-started',
    policy: policiesCount > 0 ? 'completed' : 'not-started',
    'prompt-lab':
      promptLabCount >= 5 ? 'completed' : promptLabCount > 0 ? 'in-progress' : 'not-started',
    'output-eval':
      outputEvalCount >= 3 ? 'completed' : outputEvalCount > 0 ? 'in-progress' : 'not-started',
    assignments: 'not-started',
    process: 'not-started',
    'starter-packs': 'not-started',
    'syllabus-drop': 'not-started',
    pedagogy: 'not-started',
    discipline: 'not-started',
    advising: 'not-started',
  }

  let completed = 0
  let explored = 0
  for (const status of Object.values(progress)) {
    if (status === 'completed') {
      completed++
      explored++
    } else if (status === 'in-progress') {
      explored++
    }
  }

  return { progress, modulesCompleted: completed, modulesExplored: explored }
}

// ── Main Scoring Engine ──────────────────────────────────────────────────────

export async function recalculateProfile(
  userId: string,
  options?: { studentLessonCompletions?: string[] },
): Promise<AILiteracyProfile> {
  // Check if profile exists and is seeded + untouched
  const existing = await prisma.aILiteracyProfile.findUnique({ where: { userId } })

  if (existing?.seededFromDiscovery) {
    const { modulesCompleted: currentModules } = await getModuleProgress(userId)
    if (currentModules === 0) return existing
  }

  // ── Gather all signals in parallel ────────────────────────────────────────

  const [
    moduleData,
    promptLabAttempts,
    outputEvalAttempts,
    latestStance,
    sandboxEntryCount,
    novelEvalCount,
  ] = await Promise.all([
    getModuleProgress(userId),
    prisma.promptLabAttempt.findMany({
      where: { userId },
      select: { level: true, overallScore: true },
    }),
    prisma.outputEvalAttempt.findMany({
      where: { userId },
      select: { tier: true, userRating: true, detectionScore: true, isSeeded: true },
    }),
    prisma.stanceHistory.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { newStance: true, responses: true },
    }),
    prisma.promptLabSandboxEntry.count({ where: { userId } }),
    prisma.outputEvalAttempt.count({ where: { userId, isSeeded: false } }),
  ])

  const stance: AIStance | null = existing?.stance ?? latestStance?.newStance ?? null
  const { progress, modulesCompleted, modulesExplored } = moduleData
  const studentLessons = options?.studentLessonCompletions ?? []

  // ── Comfort ───────────────────────────────────────────────────────────────
  // Average of: Prompt Lab avg score (1-10 → 0-100), Output Eval confidence (1-5 → 0-100)
  const comfortSignals: number[] = []

  if (promptLabAttempts.length > 0) {
    const avg =
      promptLabAttempts.reduce((s, a) => s + a.overallScore, 0) / promptLabAttempts.length
    comfortSignals.push(avg * 10)
  }
  if (outputEvalAttempts.length > 0) {
    const avg =
      outputEvalAttempts.reduce((s, a) => s + a.userRating, 0) / outputEvalAttempts.length
    comfortSignals.push(avg * 20)
  }

  let comfort =
    comfortSignals.length > 0
      ? comfortSignals.reduce((a, b) => a + b, 0) / comfortSignals.length
      : 0

  // Student lesson bonus
  if (studentLessons.includes('when-not-to-use')) comfort += 5
  comfort = Math.min(100, Math.round(comfort))

  // ── Pedagogy Alignment ────────────────────────────────────────────────────
  // Base from stance + bonuses for policy/assignment modules
  let pedagogyAlignment = stance ? (STANCE_PEDAGOGY_BASE[stance] ?? 0) : 0
  if (progress.policy === 'completed') pedagogyAlignment += 15
  if (progress.assignments === 'completed') pedagogyAlignment += 10
  if (studentLessons.includes('citing-ai')) pedagogyAlignment += 10
  pedagogyAlignment = Math.min(100, Math.round(pedagogyAlignment))

  // ── Curiosity ─────────────────────────────────────────────────────────────
  // Weighted avg: exploration (50%), sandbox entries (30%), novel evals (20%)
  const explorationPct = (modulesExplored / 14) * 100
  const sandboxPct = Math.min(sandboxEntryCount * 15, 100)
  const novelEvalPct = Math.min(novelEvalCount * 20, 100)
  const curiosity = Math.min(
    100,
    Math.round(explorationPct * 0.5 + sandboxPct * 0.3 + novelEvalPct * 0.2),
  )

  // ── Ethical Awareness ─────────────────────────────────────────────────────
  // Stance-derived base + module bonuses
  let ethicalAwareness = stance ? (STANCE_ETHICS_BASE[stance] ?? 0) : 0
  if (progress.discipline === 'completed') ethicalAwareness += 20
  if (progress.advising === 'completed') ethicalAwareness += 15
  // Student lesson bonuses
  if (studentLessons.includes('responsible-use')) ethicalAwareness += 15
  if (studentLessons.includes('when-not-to-use')) ethicalAwareness += 10
  if (studentLessons.includes('critical-evaluation')) ethicalAwareness += 5
  ethicalAwareness = Math.min(100, Math.round(ethicalAwareness))

  // ── Current Usage ─────────────────────────────────────────────────────────
  // Average of: Prompt Lab level 1 avg (0-10 → 0-100), Output Eval tier 1 detection (0-10 → 0-100),
  // plus optional stance Q6 signal. Missing signals excluded from average.
  const usageSignals: number[] = []

  const level1Attempts = promptLabAttempts.filter((a) => a.level === 1)
  if (level1Attempts.length > 0) {
    const avg = level1Attempts.reduce((s, a) => s + a.overallScore, 0) / level1Attempts.length
    usageSignals.push(avg * 10)
  }

  const tier1Evals = outputEvalAttempts.filter((a) => a.tier === 1)
  if (tier1Evals.length > 0) {
    const avg = tier1Evals.reduce((s, a) => s + a.detectionScore, 0) / tier1Evals.length
    usageSignals.push(avg * 10)
  }

  // Factor in stance Q6 (enforcement comfort) if available
  if (latestStance?.responses) {
    const responses = latestStance.responses as { questionId: string; selectedValue: number }[]
    const q6 = responses.find((r) => r.questionId === 'q6_enforcement')
    if (q6) {
      // Map 1-5 → 10-90
      usageSignals.push((q6.selectedValue - 1) * 20 + 10)
    }
  }

  let currentUsage =
    usageSignals.length > 0
      ? usageSignals.reduce((a, b) => a + b, 0) / usageSignals.length
      : 0

  // Student lesson bonus
  if (studentLessons.includes('critical-evaluation')) currentUsage += 10
  currentUsage = Math.min(100, Math.round(currentUsage))

  // ── Readiness ─────────────────────────────────────────────────────────────
  const readiness = computeReadiness({
    comfort,
    pedagogyAlignment,
    curiosity,
    ethicalAwareness,
    currentUsage,
  })

  // ── Materialization ───────────────────────────────────────────────────────
  const profileMaterialized = modulesCompleted >= 2

  // ── Persist ───────────────────────────────────────────────────────────────
  return prisma.aILiteracyProfile.upsert({
    where: { userId },
    create: {
      userId,
      comfort,
      pedagogyAlignment,
      curiosity,
      ethicalAwareness,
      currentUsage,
      readiness,
      modulesCompleted,
      profileMaterialized,
      lastScoredAt: new Date(),
    },
    update: {
      comfort,
      pedagogyAlignment,
      curiosity,
      ethicalAwareness,
      currentUsage,
      readiness,
      modulesCompleted,
      profileMaterialized,
      lastScoredAt: new Date(),
    },
  })
}
