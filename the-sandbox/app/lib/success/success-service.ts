import { prisma } from '../prisma'
import { computeSuccessScore } from './score-engine'
import { evaluateAndAlert } from './alert-service'
import { generateNudge } from './nudge-service'
import { INACTIVE_DAYS_SANDY_CONTEXT } from '../student-risk-constants'
import type { CourseRiskHeatmap, StudentRiskSummary } from './types'

/** Batch compute success scores for all enrolled students (cron entry point) */
export async function batchComputeScores() {
  const enrollments = await prisma.courseEnrollment.findMany({
    select: { studentId: true, courseId: true },
  })

  let computed = 0
  let alerts = 0
  const batchSize = 10

  for (let i = 0; i < enrollments.length; i += batchSize) {
    const batch = enrollments.slice(i, i + batchSize)

    await Promise.allSettled(
      batch.map(async ({ studentId: userId, courseId }) => {
        try {
          const result = await computeSuccessScore(userId, courseId)

          const existing = await prisma.studentSuccessScore.findUnique({
            where: { userId_courseId: { userId, courseId } },
          })

          await prisma.studentSuccessScore.upsert({
            where: { userId_courseId: { userId, courseId } },
            create: {
              userId,
              courseId,
              score: result.composite,
              trajectory: result.trajectory,
              loginScore: result.signals.find(s => s.signal === 'loginFrequency')?.score,
              assignmentScore: result.signals.find(s => s.signal === 'assignmentSubmission')?.score,
              sandyUsageScore: result.signals.find(s => s.signal === 'sandyUsageDecay')?.score,
              studySessionScore: result.signals.find(s => s.signal === 'studySessionCadence')?.score,
              conceptMasteryScore: result.signals.find(s => s.signal === 'conceptMasterySlope')?.score,
              commonsScore: result.signals.find(s => s.signal === 'commonsParticipation')?.score,
              flashcardScore: result.signals.find(s => s.signal === 'flashcardConsistency')?.score,
              gradeTrendScore: result.signals.find(s => s.signal === 'gradeTrend')?.score,
              toolEngagementScore: result.signals.find(s => s.signal === 'toolEngagement')?.score,
              contentAccessScore: result.signals.find(s => s.signal === 'contentAccess')?.score,
              inflectionDetected: !!result.inflection,
              inflectionType: result.inflection?.type,
              inflectionDetectedAt: result.inflection?.detectedAt,
              baselineScore: result.composite,
              peakScore: result.composite,
            },
            update: {
              previousScore: existing?.score,
              score: result.composite,
              scoreDelta7d: existing ? result.composite - existing.score : 0,
              trajectory: result.trajectory,
              loginScore: result.signals.find(s => s.signal === 'loginFrequency')?.score,
              assignmentScore: result.signals.find(s => s.signal === 'assignmentSubmission')?.score,
              sandyUsageScore: result.signals.find(s => s.signal === 'sandyUsageDecay')?.score,
              studySessionScore: result.signals.find(s => s.signal === 'studySessionCadence')?.score,
              conceptMasteryScore: result.signals.find(s => s.signal === 'conceptMasterySlope')?.score,
              commonsScore: result.signals.find(s => s.signal === 'commonsParticipation')?.score,
              flashcardScore: result.signals.find(s => s.signal === 'flashcardConsistency')?.score,
              gradeTrendScore: result.signals.find(s => s.signal === 'gradeTrend')?.score,
              toolEngagementScore: result.signals.find(s => s.signal === 'toolEngagement')?.score,
              contentAccessScore: result.signals.find(s => s.signal === 'contentAccess')?.score,
              inflectionDetected: !!result.inflection,
              inflectionType: result.inflection?.type,
              inflectionDetectedAt: result.inflection?.detectedAt,
              peakScore: existing?.peakScore != null && result.composite > existing.peakScore ? result.composite : undefined,
            },
          })

          await prisma.successScoreHistory.create({
            data: {
              userId,
              courseId,
              score: result.composite,
              trajectory: result.trajectory,
              topSignal: result.signals.sort((a, b) => a.score - b.score)[0]?.signal,
              topSignalDelta: result.signals.sort((a, b) => a.score - b.score)[0]?.delta7d,
              computedAt: new Date(),
            },
          })

          const alertId = await evaluateAndAlert(userId, courseId, result)
          if (alertId) alerts++

          computed++
        } catch (err) {
          console.error(`Failed to compute score for ${userId}/${courseId}:`, err)
        }
      })
    )
  }

  return { computed, alerts, total: enrollments.length }
}

/** Get course-level risk heatmap for faculty dashboard */
export async function getCourseRiskHeatmap(courseId: string): Promise<CourseRiskHeatmap> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  })

  const scores = await prisma.studentSuccessScore.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { score: 'asc' },
  })

  const distribution = {
    healthy: scores.filter(s => s.score >= 70).length,
    watch: scores.filter(s => s.score >= 50 && s.score < 70).length,
    concern: scores.filter(s => s.score >= 30 && s.score < 50).length,
    urgent: scores.filter(s => s.score >= 10 && s.score < 30).length,
    critical: scores.filter(s => s.score < 10).length,
  }

  const topRiskStudents: StudentRiskSummary[] = scores
    .filter(s => s.score < 50)
    .slice(0, 10)
    .map(s => ({
      userId: s.userId,
      userName: s.user.name ?? 'Unknown',
      score: s.score,
      trajectory: s.trajectory as StudentRiskSummary['trajectory'],
      severity: s.score < 15 ? 'CRITICAL' : s.score < 30 ? 'URGENT' : 'CONCERN',
      topSignals: [
        s.loginScore != null ? { signal: 'login', score: s.loginScore, delta: 0 } : null,
        s.assignmentScore != null ? { signal: 'assignments', score: s.assignmentScore, delta: 0 } : null,
        s.gradeTrendScore != null ? { signal: 'grades', score: s.gradeTrendScore, delta: 0 } : null,
      ].filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => a.score - b.score).slice(0, 3),
      daysSinceActive: s.daysSinceActive,
      openAlerts: 0,
      lastIntervention: null,
    }))

  return {
    courseId,
    courseName: course?.title ?? 'Unknown',
    totalStudents: scores.length,
    distribution,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0,
    avgDelta7d: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + (s.scoreDelta7d ?? 0), 0) / scores.length) : 0,
    topRiskStudents,
  }
}

/** Get student's current nudge */
export async function getStudentNudge(userId: string) {
  const score = await prisma.studentSuccessScore.findFirst({
    where: { userId },
    orderBy: { score: 'asc' },
  })

  if (!score || score.score >= 70) return null

  const result = await computeSuccessScore(userId, score.courseId)
  return generateNudge(result)
}

/** Build Sandy context block for a student's success profile */
export function buildSandySuccessContext(score: {
  score: number
  trajectory: string
  inflectionDetected: boolean
  daysSinceActive: number
}): string {
  if (!score) return ''

  const lines: string[] = ['<student-success-profile>']
  lines.push(`  <score>${score.score}/100</score>`)
  lines.push(`  <trajectory>${score.trajectory}</trajectory>`)
  if (score.inflectionDetected) {
    lines.push(`  <inflection-alert>true</inflection-alert>`)
  }
  if (score.daysSinceActive > INACTIVE_DAYS_SANDY_CONTEXT) {
    lines.push(`  <days-since-active>${score.daysSinceActive}</days-since-active>`)
  }
  lines.push(`  <instruction>If the student seems disengaged, use a warm, inviting tone. Never say "you're falling behind" or shame them. Instead, offer to help with specific tasks or remind them of what they were working on.</instruction>`)
  lines.push('</student-success-profile>')

  return lines.join('\n')
}

/** Build briefing injection for faculty morning briefing */
export async function buildBriefingRiskSummary(courseId: string): Promise<string | null> {
  const alerts = await prisma.successAlert.findMany({
    where: {
      courseId,
      status: 'active',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { severity: 'desc' },
    take: 5,
  })

  if (alerts.length === 0) return null

  const critical = alerts.filter(a => a.severity === 'CRITICAL').length
  const urgent = alerts.filter(a => a.severity === 'URGENT').length
  const concern = alerts.filter(a => a.severity === 'CONCERN').length

  let summary = `Student Success Alerts: `
  const parts: string[] = []
  if (critical > 0) parts.push(`${critical} critical`)
  if (urgent > 0) parts.push(`${urgent} urgent`)
  if (concern > 0) parts.push(`${concern} concern`)
  summary += parts.join(', ') + '. '

  const top3 = alerts.slice(0, 3)
  for (const alert of top3) {
    summary += `${alert.user.name}: ${alert.triggerReason.slice(0, 100)}. `
  }

  return summary
}
