import type { SignalScore, SuccessScoreResult, Trajectory, InflectionResult, PatternClassification } from './types'
import { DEFAULT_SIGNAL_WEIGHTS, TRAJECTORY_THRESHOLDS } from './types'
import * as collectors from './signal-collectors'
import { prisma } from '../prisma'

const SIGNAL_COLLECTORS: Record<string, (userId: string, courseId: string) => Promise<{ score: number; detail: string; rawMetrics: Record<string, number> }>> = {
  loginFrequency: collectors.computeLoginScore,
  assignmentSubmission: collectors.computeAssignmentScore,
  sandyUsageDecay: collectors.computeSandyUsageScore,
  studySessionCadence: collectors.computeStudySessionScore,
  conceptMasterySlope: collectors.computeConceptMasteryScore,
  commonsParticipation: collectors.computeCommonsScore,
  flashcardConsistency: collectors.computeFlashcardScore,
  gradeTrend: collectors.computeGradeTrendScore,
  toolEngagement: collectors.computeToolEngagementScore,
  contentAccess: collectors.computeContentAccessScore,
}

/** Compute full success score for a student in a course */
export async function computeSuccessScore(
  userId: string,
  courseId: string,
  personalizedWeights?: Record<string, number>
): Promise<SuccessScoreResult> {
  const weights = personalizedWeights ?? DEFAULT_SIGNAL_WEIGHTS

  const signalEntries = Object.entries(SIGNAL_COLLECTORS)
  const results = await Promise.allSettled(
    signalEntries.map(([key, fn]) => fn(userId, courseId).then(r => ({ key, ...r })))
  )

  const signals: SignalScore[] = []
  let weightedSum = 0
  let totalWeight = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { key, score, detail, rawMetrics } = result.value
      const weight = weights[key] ?? 0.05

      signals.push({
        signal: key,
        score,
        delta7d: 0,
        detail,
        rawMetrics,
      })

      weightedSum += score * weight
      totalWeight += weight
    }
  }

  const composite = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50

  const existing = await prisma.studentSuccessScore.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })

  const delta7d = existing?.scoreDelta7d ?? 0
  const actualDelta = existing ? composite - existing.score : 0
  const trajectory = classifyTrajectory(actualDelta, delta7d)

  const inflection = await detectInflection(userId, courseId, composite, signals)
  const pattern = classifyPattern(signals, composite, trajectory)

  return { composite, trajectory, signals, inflection, pattern }
}

function classifyTrajectory(currentDelta: number, rollingDelta7d: number): Trajectory {
  const delta = currentDelta || rollingDelta7d
  if (delta >= TRAJECTORY_THRESHOLDS.improving) return 'improving'
  if (delta <= TRAJECTORY_THRESHOLDS.critical_decline) return 'critical_decline'
  if (delta <= TRAJECTORY_THRESHOLDS.declining) return 'declining'
  return 'stable'
}

async function detectInflection(
  userId: string,
  courseId: string,
  currentScore: number,
  signals: SignalScore[]
): Promise<InflectionResult | null> {
  const history = await prisma.successScoreHistory.findMany({
    where: { userId, courseId },
    orderBy: { computedAt: 'desc' },
    take: 14,
  })

  if (history.length < 3) return null

  const scores = history.map(h => h.score).reverse()
  const recent3 = scores.slice(-3)
  const prior3 = scores.slice(-6, -3)

  if (prior3.length < 3) return null

  const recentAvg = recent3.reduce((a, b) => a + b, 0) / 3
  const priorAvg = prior3.reduce((a, b) => a + b, 0) / 3
  const delta = recentAvg - priorAvg

  if (delta <= -20) {
    return {
      type: 'sudden_drop',
      magnitude: Math.min(1, Math.abs(delta) / 40),
      primaryDrivers: signals.filter(s => s.score < 40).map(s => s.signal).slice(0, 3),
      detectedAt: new Date(),
    }
  }

  if (scores.length >= 7) {
    const weekAvg = scores.slice(-7).reduce((a, b) => a + b, 0) / 7
    const priorSlice = scores.slice(-14, -7)
    const priorWeekAvg = priorSlice.reduce((a, b) => a + b, 0) / Math.max(1, priorSlice.length)
    if (priorWeekAvg - weekAvg >= 10) {
      return {
        type: 'gradual_decline',
        magnitude: Math.min(1, (priorWeekAvg - weekAvg) / 30),
        primaryDrivers: signals.sort((a, b) => a.score - b.score).map(s => s.signal).slice(0, 3),
        detectedAt: new Date(),
      }
    }
  }

  if (delta >= 10 && prior3.some(s => s < 50)) {
    return {
      type: 'recovery',
      magnitude: Math.min(1, delta / 30),
      primaryDrivers: signals.filter(s => s.score > 70).map(s => s.signal).slice(0, 3),
      detectedAt: new Date(),
    }
  }

  return null
}

function classifyPattern(signals: SignalScore[], composite: number, trajectory: Trajectory): PatternClassification | null {
  if (composite >= 60 && trajectory !== 'declining' && trajectory !== 'critical_decline') return null

  const lowSignals = signals.filter(s => s.score < 40)
  const lowNames = new Set(lowSignals.map(s => s.signal))

  if (lowSignals.length >= 4) {
    return {
      type: 'broad_disengagement',
      confidence: Math.min(1, lowSignals.length / 6),
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'BOTH',
    }
  }

  if (lowNames.has('gradeTrend') && lowNames.has('assignmentSubmission') && !lowNames.has('loginFrequency')) {
    return {
      type: 'academic_decline',
      confidence: 0.8,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'INSTRUCTOR',
    }
  }

  const loginSignal = signals.find(s => s.signal === 'loginFrequency')
  if (loginSignal && loginSignal.score < 10) {
    return {
      type: 'sudden_absence',
      confidence: 0.9,
      evidence: [`Login score: ${loginSignal.score}/100 — ${loginSignal.detail}`],
      suggestedTarget: 'ADVISOR',
    }
  }

  if (lowNames.has('commonsParticipation') && !lowNames.has('assignmentSubmission') && !lowNames.has('gradeTrend')) {
    return {
      type: 'social_withdrawal',
      confidence: 0.6,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'SELF_SERVE',
    }
  }

  if (lowNames.has('flashcardConsistency') && lowNames.has('studySessionCadence')) {
    return {
      type: 'study_abandonment',
      confidence: 0.7,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'SELF_SERVE',
    }
  }

  if (lowSignals.length >= 2 && trajectory === 'declining') {
    return {
      type: 'gradual_fade',
      confidence: 0.6,
      evidence: lowSignals.map(s => `${s.signal}: ${s.score}/100 — ${s.detail}`),
      suggestedTarget: 'INSTRUCTOR',
    }
  }

  return null
}
