/**
 * A/B Pedagogical Experiments
 *
 * Manages the full lifecycle of educator-designed pedagogical experiments:
 *   - enrollStudent       — assign student to control or treatment arm
 *   - isStudentInTreatment — fast arm lookup for runtime feature gates
 *   - recordOutcomeSnapshot — compute Welch's t-test stats at a point in time
 *   - computeWelchsT      — pure statistical function
 *   - generateOutcomeNarrative — Haiku narrative cached on ExperimentOutcomeSnapshot
 *
 * Design note: ExperimentEnrollmentMode.AUTOMATIC uses a seeded deterministic
 * coin flip (HMAC of experimentId + userId) so arm assignment is reproducible
 * and balanced without a coordination lock.
 */

import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import { prisma } from './prisma'

const anthropic = new Anthropic()

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WelchResult {
  controlMean: number
  treatmentMean: number
  controlStd: number
  treatmentStd: number
  welchT: number
  degreesOfFreedom: number
  pValue: number
  cohensD: number
  significant: boolean
}

// ── Enrollment ────────────────────────────────────────────────────────────────

/**
 * Enroll a student in an experiment and assign them to an arm.
 *
 * AUTOMATIC mode: deterministic 50/50 split using HMAC-SHA256 of
 * (experimentId + userId) — no DB read required for the flip.
 *
 * MANUAL mode: always assigns "control"; caller must manually update
 * the arm field after creation if they want treatment.
 *
 * Idempotent: if the student is already enrolled, returns the existing arm.
 */
export async function enrollStudent(
  experimentId: string,
  userId: string,
): Promise<'control' | 'treatment'> {
  // Fast-path: already enrolled
  const existing = await prisma.experimentEnrollment.findUnique({
    where: { experimentId_userId: { experimentId, userId } },
    select: { arm: true },
  })
  if (existing) return existing.arm as 'control' | 'treatment'

  // Verify experiment is accepting enrollments
  const experiment = await prisma.pedagogicalExperiment.findUnique({
    where: { id: experimentId },
    select: { status: true, enrollmentMode: true },
  })
  if (!experiment || experiment.status !== 'ACTIVE') {
    throw new Error(`Experiment ${experimentId} is not ACTIVE`)
  }

  let arm: 'control' | 'treatment'
  if (experiment.enrollmentMode === 'AUTOMATIC') {
    arm = deterministicArm(experimentId, userId)
  } else {
    // MANUAL — default to control; researcher overrides via PATCH
    arm = 'control'
  }

  await prisma.experimentEnrollment.create({
    data: { experimentId, userId, arm },
  })
  return arm
}

/**
 * Deterministic 50/50 arm assignment.
 * HMAC-SHA256(secret=experimentId, data=userId) → take first 4 bytes as uint32
 * → even = "control", odd = "treatment"
 */
function deterministicArm(experimentId: string, userId: string): 'control' | 'treatment' {
  const mac = crypto.createHmac('sha256', experimentId).update(userId).digest()
  const uint32 = mac.readUInt32BE(0)
  return uint32 % 2 === 0 ? 'control' : 'treatment'
}

// ── Runtime Gate ──────────────────────────────────────────────────────────────

/**
 * Returns true if the student is enrolled in the treatment arm of this
 * experiment. Returns false for control, unenrolled, or inactive experiment.
 *
 * Designed for hot-path use in chat-service.ts / concierge-service.ts.
 * Response is NOT cached here — callers should apply their own LRU if needed.
 */
export async function isStudentInTreatment(
  experimentId: string,
  userId: string,
): Promise<boolean> {
  const enrollment = await prisma.experimentEnrollment.findUnique({
    where: { experimentId_userId: { experimentId, userId } },
    select: { arm: true },
  })
  return enrollment?.arm === 'treatment'
}

// ── Outcome Snapshots ─────────────────────────────────────────────────────────

/**
 * Compute a point-in-time outcome snapshot for an experiment.
 *
 * Primary metric mapping:
 *   "mastery_delta"      → avg(correct / attempts) from StudentObjectiveProgress
 *   "avg_score"          → avg(ToolSession.score) from sessions in the course
 *   "session_completion" → fraction of sessions with exitReason = "completed"
 *   "concept_coverage"   → avg(size of conceptsTouched array) from ToolSession
 *
 * Requires ≥4 participants per arm (Welch's t-test is unreliable below that).
 * Returns null and logs a warning if the sample is too small.
 */
export async function recordOutcomeSnapshot(
  experimentId: string,
): Promise<string | null> {
  const experiment = await prisma.pedagogicalExperiment.findUnique({
    where: { id: experimentId },
    select: { courseId: true, primaryMetric: true, status: true },
  })
  if (!experiment) throw new Error(`Experiment ${experimentId} not found`)
  if (experiment.status === 'DRAFT' || experiment.status === 'ARCHIVED') {
    console.warn(`[ab-experiments] Cannot snapshot ${experimentId} in status ${experiment.status}`)
    return null
  }

  // Fetch arm assignments
  const enrollments = await prisma.experimentEnrollment.findMany({
    where: { experimentId },
    select: { userId: true, arm: true },
  })
  const controlIds = enrollments.filter((e) => e.arm === 'control').map((e) => e.userId)
  const treatmentIds = enrollments.filter((e) => e.arm === 'treatment').map((e) => e.userId)

  if (controlIds.length < 4 || treatmentIds.length < 4) {
    console.warn(
      `[ab-experiments] Sample too small: control=${controlIds.length}, treatment=${treatmentIds.length}`,
    )
    return null
  }

  // Collect metric values per arm
  const [controlValues, treatmentValues] = await Promise.all([
    collectMetricValues(experiment.courseId, controlIds, experiment.primaryMetric),
    collectMetricValues(experiment.courseId, treatmentIds, experiment.primaryMetric),
  ])

  if (controlValues.length < 4 || treatmentValues.length < 4) {
    console.warn(
      `[ab-experiments] Insufficient data points after metric collection`,
    )
    return null
  }

  const stats = computeWelchsT(controlValues, treatmentValues)

  const snapshot = await prisma.experimentOutcomeSnapshot.create({
    data: {
      experimentId,
      controlN: controlValues.length,
      treatmentN: treatmentValues.length,
      controlMean: stats.controlMean,
      treatmentMean: stats.treatmentMean,
      controlStd: stats.controlStd,
      treatmentStd: stats.treatmentStd,
      welchT: stats.welchT,
      degreesOfFreedom: stats.degreesOfFreedom,
      pValue: stats.pValue,
      cohensD: stats.cohensD,
      significant: stats.significant,
    },
    select: { id: true },
  })

  return snapshot.id
}

async function collectMetricValues(
  courseId: string,
  userIds: string[],
  metric: string,
): Promise<number[]> {
  if (userIds.length === 0) return []

  switch (metric) {
    case 'mastery_delta': {
      const rows = await prisma.studentObjectiveProgress.findMany({
        where: { courseId, studentId: { in: userIds }, attempts: { gt: 0 } },
        select: { studentId: true, correct: true, attempts: true },
      })
      // One value per student: mean(correct/attempts) across their objectives
      const byStudent = new Map<string, number[]>()
      for (const r of rows) {
        const arr = byStudent.get(r.studentId) ?? []
        arr.push(r.correct / r.attempts)
        byStudent.set(r.studentId, arr)
      }
      return [...byStudent.values()].map(
        (vals) => vals.reduce((s, v) => s + v, 0) / vals.length,
      )
    }

    case 'avg_score': {
      const rows = await prisma.toolSession.findMany({
        where: { courseId, userId: { in: userIds }, score: { not: null }, sensitiveSession: false },
        select: { userId: true, score: true },
      })
      const byStudent = new Map<string, number[]>()
      for (const r of rows) {
        if (r.userId && r.score !== null) {
          const arr = byStudent.get(r.userId) ?? []
          arr.push(r.score)
          byStudent.set(r.userId, arr)
        }
      }
      return [...byStudent.values()].map(
        (vals) => vals.reduce((s, v) => s + v, 0) / vals.length,
      )
    }

    case 'session_completion': {
      const rows = await prisma.toolSession.findMany({
        where: { courseId, userId: { in: userIds }, sensitiveSession: false },
        select: { userId: true, exitReason: true },
      })
      const byStudent = new Map<string, { total: number; completed: number }>()
      for (const r of rows) {
        if (!r.userId) continue
        const cur = byStudent.get(r.userId) ?? { total: 0, completed: 0 }
        cur.total++
        if (r.exitReason === 'completed') cur.completed++
        byStudent.set(r.userId, cur)
      }
      return [...byStudent.values()]
        .filter((v) => v.total > 0)
        .map((v) => v.completed / v.total)
    }

    case 'concept_coverage': {
      const rows = await prisma.toolSession.findMany({
        where: { courseId, userId: { in: userIds }, sensitiveSession: false },
        select: { userId: true, conceptsTouched: true },
      })
      const byStudent = new Map<string, number[]>()
      for (const r of rows) {
        if (!r.userId) continue
        const arr = byStudent.get(r.userId) ?? []
        arr.push(r.conceptsTouched.length)
        byStudent.set(r.userId, arr)
      }
      return [...byStudent.values()].map(
        (vals) => vals.reduce((s, v) => s + v, 0) / vals.length,
      )
    }

    default:
      console.warn(`[ab-experiments] Unknown metric: ${metric}`)
      return []
  }
}

// ── Welch's t-test ────────────────────────────────────────────────────────────

/**
 * Two-sample Welch's t-test (unequal variances).
 *
 * Uses the Welch–Satterthwaite equation for degrees of freedom.
 * p-value is approximated via a regularized incomplete beta function
 * (accurate to ~4 decimal places for df > 5).
 *
 * Cohen's d uses the pooled SD of the two samples.
 */
export function computeWelchsT(
  controlValues: number[],
  treatmentValues: number[],
): WelchResult {
  const n1 = controlValues.length
  const n2 = treatmentValues.length

  const mean1 = mean(controlValues)
  const mean2 = mean(treatmentValues)

  const s1 = std(controlValues, mean1)
  const s2 = std(treatmentValues, mean2)

  const se1Sq = (s1 * s1) / n1  // variance of the mean for group 1
  const se2Sq = (s2 * s2) / n2  // variance of the mean for group 2
  const seDiff = Math.sqrt(se1Sq + se2Sq)

  const welchT = seDiff === 0 ? 0 : (mean2 - mean1) / seDiff

  // Welch–Satterthwaite degrees of freedom
  const df =
    se1Sq + se2Sq === 0
      ? n1 + n2 - 2
      : Math.pow(se1Sq + se2Sq, 2) /
        (Math.pow(se1Sq, 2) / (n1 - 1) + Math.pow(se2Sq, 2) / (n2 - 1))

  const pValue = twoTailedPValue(Math.abs(welchT), df)

  // Cohen's d (pooled SD denominator)
  const pooledStd =
    Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2))
  const cohensD = pooledStd === 0 ? 0 : (mean2 - mean1) / pooledStd

  return {
    controlMean: round4(mean1),
    treatmentMean: round4(mean2),
    controlStd: round4(s1),
    treatmentStd: round4(s2),
    welchT: round4(welchT),
    degreesOfFreedom: round4(df),
    pValue: round4(pValue),
    cohensD: round4(cohensD),
    significant: pValue < 0.05,
  }
}

/** Sample mean */
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

/** Sample standard deviation (Bessel's correction) */
function std(values: number[], m: number): number {
  if (values.length < 2) return 0
  const variance =
    values.reduce((s, v) => s + (v - m) * (v - m), 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * Two-tailed p-value for t-distribution.
 *
 * Uses a rational approximation of the regularized incomplete beta function
 * I(x; a, b) where x = df/(df + t²), a = df/2, b = 0.5.
 * Accurate to ~4 significant figures for df > 5.
 *
 * Based on Abramowitz & Stegun §26.7.8.
 */
function twoTailedPValue(t: number, df: number): number {
  if (df <= 0) return 1
  const x = df / (df + t * t)
  const p = incompleteBeta(x, df / 2, 0.5)
  return Math.min(1, Math.max(0, p))
}

/**
 * Regularized incomplete beta function I(x; a, b) via continued fraction
 * expansion (Lentz's method).  Sufficient for our parameter ranges.
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1

  // Use symmetry relation when x > (a+1)/(a+b+2)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(1 - x, b, a)
  }

  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a

  // Continued fraction via modified Lentz
  let f = 1
  let C = 1
  let D = 1 - ((a + b) * x) / (a + 1)
  D = D === 0 ? 1e-30 : 1 / D
  f = D

  for (let m = 1; m <= 200; m++) {
    // Even step
    let numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m))
    D = 1 + numerator * D
    C = 1 + numerator / C
    D = D === 0 ? 1e-30 : 1 / D
    C = C === 0 ? 1e-30 : C
    f *= C * D

    // Odd step
    numerator = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1))
    D = 1 + numerator * D
    C = 1 + numerator / C
    D = D === 0 ? 1e-30 : 1 / D
    C = C === 0 ? 1e-30 : C
    const delta = C * D
    f *= delta
    if (Math.abs(delta - 1) < 1e-8) break
  }

  return front * f
}

/** Log-gamma via Stirling series (Lanczos approximation, g=7) */
function logGamma(z: number): number {
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  z -= 1
  let x = p[0]
  for (let i = 1; i < 9; i++) x += p[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

// ── Outcome Narrative ─────────────────────────────────────────────────────────

/**
 * Generate and cache a Haiku narrative for an ExperimentOutcomeSnapshot.
 *
 * Idempotent: if narrativeGeneratedAt is already set, returns the cached text.
 * Cost: ~$0.0013 per call (150 tokens in + 100 tokens out at Haiku pricing).
 */
export async function generateOutcomeNarrative(snapshotId: string): Promise<string> {
  const snapshot = await prisma.experimentOutcomeSnapshot.findUnique({
    where: { id: snapshotId },
    include: {
      experiment: {
        select: { title: true, hypothesis: true, primaryMetric: true, controlLabel: true, treatmentLabel: true },
      },
    },
  })
  if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`)

  // Return cached narrative if available
  if (snapshot.narrativeGeneratedAt && snapshot.narrative) {
    return snapshot.narrative
  }

  const prompt = `You are an educational researcher summarizing an A/B experiment outcome for a university professor.

Experiment: "${snapshot.experiment.title}"
Hypothesis: ${snapshot.experiment.hypothesis}
Primary metric: ${snapshot.experiment.primaryMetric}
Control arm ("${snapshot.experiment.controlLabel}"): n=${snapshot.controlN}, mean=${snapshot.controlMean}, SD=${snapshot.controlStd}
Treatment arm ("${snapshot.experiment.treatmentLabel}"): n=${snapshot.treatmentN}, mean=${snapshot.treatmentMean}, SD=${snapshot.treatmentStd}
Welch's t = ${snapshot.welchT}, df = ${snapshot.degreesOfFreedom}, p = ${snapshot.pValue}
Cohen's d = ${snapshot.cohensD}
Statistically significant: ${snapshot.significant}

Write a 3–4 sentence summary for a non-statistician faculty audience:
1. State what was found (direction and size of effect)
2. Interpret statistical significance in plain language
3. Give one practical implication or recommended next step

Do NOT use jargon. Do NOT start with "In this experiment". Respond with ONLY the narrative text.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const narrative =
      response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    await prisma.experimentOutcomeSnapshot.update({
      where: { id: snapshotId },
      data: { narrative, narrativeGeneratedAt: new Date() },
    })

    return narrative
  } catch (err) {
    console.error(`[ab-experiments] Narrative generation failed for snapshot ${snapshotId}:`, err)
    return ''
  }
}
