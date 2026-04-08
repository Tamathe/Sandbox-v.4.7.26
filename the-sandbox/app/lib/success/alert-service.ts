import { prisma } from '../prisma'
import type { Prisma } from '../../generated/prisma'
import type { SuccessScoreResult, InterventionSuggestion } from './types'
import { SEVERITY_THRESHOLDS } from './types'
import { INTERVENTION_OUTCOME_TIMEOUT_DAYS } from '../student-risk-constants'

/** Generate an alert if the score warrants one */
export async function evaluateAndAlert(
  userId: string,
  courseId: string,
  result: SuccessScoreResult
): Promise<string | null> {
  const { composite, signals, inflection, pattern } = result

  let severity: string
  if (composite < SEVERITY_THRESHOLDS.CRITICAL) severity = 'CRITICAL'
  else if (composite < SEVERITY_THRESHOLDS.URGENT) severity = 'URGENT'
  else if (composite < SEVERITY_THRESHOLDS.CONCERN) severity = 'CONCERN'
  else if (composite < SEVERITY_THRESHOLDS.WATCH) severity = 'WATCH'
  else return null

  const existingAlert = await prisma.successAlert.findFirst({
    where: {
      userId,
      courseId,
      status: { in: ['active', 'acknowledged'] },
    },
  })

  if (existingAlert) {
    const severityOrder = ['WATCH', 'CONCERN', 'URGENT', 'CRITICAL']
    const existingIdx = severityOrder.indexOf(existingAlert.severity)
    const newIdx = severityOrder.indexOf(severity)
    if (newIdx <= existingIdx) return null
  }

  const lowSignals = signals.filter(s => s.score < 50).sort((a, b) => a.score - b.score)
  const triggerReason = buildTriggerReason(composite, lowSignals, inflection)
  const routeTarget = pattern?.suggestedTarget ?? (severity === 'CRITICAL' ? 'BOTH' : 'INSTRUCTOR')
  const suggestedActions = generateSuggestions(signals, pattern, severity)

  const scoreRecord = await prisma.studentSuccessScore.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })

  if (!scoreRecord) return null

  const alert = await prisma.successAlert.create({
    data: {
      userId,
      courseId,
      scoreId: scoreRecord.id,
      severity: severity as 'WATCH' | 'CONCERN' | 'URGENT' | 'CRITICAL',
      routeTarget: routeTarget as 'INSTRUCTOR' | 'ADVISOR' | 'BOTH' | 'SELF_SERVE',
      triggerReason,
      signalBreakdown: lowSignals.map(s => ({
        signal: s.signal,
        score: s.score,
        delta: s.delta7d,
        detail: s.detail,
      })),
      suggestedActions: suggestedActions as unknown as Prisma.InputJsonValue,
      patternType: pattern?.type ?? null,
      confidenceScore: pattern?.confidence ?? null,
      expiresAt: new Date(Date.now() + 14 * 86400000),
    },
  })

  return alert.id
}

function buildTriggerReason(
  score: number,
  lowSignals: { signal: string; score: number; detail: string }[],
  inflection: SuccessScoreResult['inflection']
): string {
  const parts: string[] = [`Success score: ${score}/100.`]

  if (inflection) {
    parts.push(`Inflection detected: ${inflection.type} (magnitude: ${(inflection.magnitude * 100).toFixed(0)}%).`)
  }

  if (lowSignals.length > 0) {
    parts.push(`Primary concerns: ${lowSignals.slice(0, 3).map(s => `${s.signal} (${s.score}/100)`).join(', ')}.`)
  }

  return parts.join(' ')
}

function generateSuggestions(
  signals: { signal: string; score: number }[],
  pattern: SuccessScoreResult['pattern'],
  severity: string
): InterventionSuggestion[] {
  const suggestions: InterventionSuggestion[] = []
  const lowSignals = new Set(signals.filter(s => s.score < 40).map(s => s.signal))

  if (lowSignals.has('assignmentSubmission')) {
    suggestions.push({
      action: 'Send personal check-in about missing assignments',
      reason: 'Multiple assignments missing — may need deadline extension or accommodation',
      urgency: severity === 'CRITICAL' ? 'immediate' : 'this_week',
      type: 'INSTRUCTOR_OUTREACH',
    })
  }

  if (lowSignals.has('flashcardConsistency') || lowSignals.has('studySessionCadence')) {
    suggestions.push({
      action: 'Sandy nudge to restart study sessions',
      reason: 'Study habits have dropped off — gentle re-engagement prompt',
      urgency: 'this_week',
      type: 'SANDY_NUDGE',
    })
  }

  if (pattern?.type === 'broad_disengagement' || pattern?.type === 'sudden_absence') {
    suggestions.push({
      action: 'Advisor check-in meeting',
      reason: 'Broad disengagement across multiple areas suggests non-academic barrier',
      urgency: 'immediate',
      type: 'ADVISOR_MEETING',
    })
  }

  if (lowSignals.has('commonsParticipation')) {
    suggestions.push({
      action: 'Connect with study group or peer mentor',
      reason: 'Social engagement has declined — peer connection may help',
      urgency: 'when_convenient',
      type: 'PEER_CONNECTION',
    })
  }

  if (lowSignals.has('conceptMasterySlope')) {
    suggestions.push({
      action: 'Recommend Study Buddy session on struggling concepts',
      reason: 'Concept mastery is declining — targeted tutoring may help',
      urgency: 'this_week',
      type: 'SANDY_NUDGE',
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      action: 'Monitor for another 7 days',
      reason: 'Signals are mixed — continue tracking before intervention',
      urgency: 'when_convenient',
      type: 'CUSTOM',
    })
  }

  return suggestions
}

/** Acknowledge an alert */
export async function acknowledgeAlert(alertId: string, userId: string) {
  return prisma.successAlert.update({
    where: { id: alertId },
    data: { status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() },
  })
}

/** Dismiss an alert */
export async function dismissAlert(alertId: string, reason: string) {
  return prisma.successAlert.update({
    where: { id: alertId },
    data: { status: 'dismissed', dismissReason: reason },
  })
}

/** Record an intervention action */
export async function recordIntervention(input: {
  alertId: string
  userId: string
  initiatorId: string
  type: string
  notes: string
}) {
  const alert = await prisma.successAlert.update({
    where: { id: input.alertId },
    data: { status: 'acted_on', actedOnAt: new Date() },
  })

  const scoreAtIntervention = await prisma.studentSuccessScore.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: alert.courseId } },
  })

  return prisma.successIntervention.create({
    data: {
      alertId: input.alertId,
      userId: input.userId,
      initiatorId: input.initiatorId,
      type: input.type as 'SANDY_NUDGE' | 'INSTRUCTOR_OUTREACH' | 'ADVISOR_MEETING' | 'PEER_CONNECTION' | 'RESOURCE_REFERRAL' | 'ACCOMMODATION_REVIEW' | 'CUSTOM',
      notes: input.notes,
      scoreAtIntervention: scoreAtIntervention?.score ?? null,
    },
  })
}

/** Check intervention outcomes (run daily by cron) */
export async function evaluateInterventionOutcomes() {
  const pending = await prisma.successIntervention.findMany({
    where: {
      outcome: 'PENDING',
      createdAt: { lte: new Date(Date.now() - 7 * 86400000) },
    },
    include: { alert: true },
  })

  let evaluated = 0

  for (const intervention of pending) {
    const currentScore = await prisma.studentSuccessScore.findUnique({
      where: { userId_courseId: { userId: intervention.userId, courseId: intervention.alert.courseId } },
    })

    if (!currentScore) continue

    const scoreDelta = currentScore.score - (intervention.scoreAtIntervention ?? 0)
    let outcome: string

    if (scoreDelta >= 15) outcome = 'RE_ENGAGED'
    else if (scoreDelta >= 5) outcome = 'PARTIAL'
    else if (scoreDelta <= -10) outcome = 'ESCALATED'
    else outcome = 'NO_CHANGE'

    const daysSince = (Date.now() - intervention.createdAt.getTime()) / 86400000
    if (daysSince >= INTERVENTION_OUTCOME_TIMEOUT_DAYS && outcome === 'NO_CHANGE') outcome = 'UNKNOWN'

    await prisma.successIntervention.update({
      where: { id: intervention.id },
      data: {
        outcome: outcome as 'RE_ENGAGED' | 'PARTIAL' | 'NO_CHANGE' | 'ESCALATED' | 'UNKNOWN',
        scoreAtOutcome: currentScore.score,
        outcomeDetectedAt: new Date(),
        reEngagementSignals: {
          scoreBefore: intervention.scoreAtIntervention,
          scoreAfter: currentScore.score,
          delta: scoreDelta,
          trajectory: currentScore.trajectory,
        },
      },
    })

    if (outcome === 'RE_ENGAGED') {
      await prisma.successAlert.update({
        where: { id: intervention.alertId },
        data: { status: 'resolved', resolvedAt: new Date() },
      })
    }

    evaluated++
  }

  return { evaluated }
}

/** Get alerts for a course, filtered by role-appropriate visibility */
export async function getCourseAlerts(courseId: string, requesterId: string, role: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  })

  if (!course) throw new Error('Course not found')
  if (role !== 'ADMIN' && course.instructorId !== requesterId) {
    throw new Error('Access denied: not the course instructor')
  }

  return prisma.successAlert.findMany({
    where: {
      courseId,
      status: { in: ['active', 'acknowledged', 'acted_on'] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      interventions: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
  })
}
