/**
 * Seed script: Student Success Early Warning demo data
 *
 * Creates synthetic success scores, alerts, and interventions for Tiana
 * in Katie's TEK-100 course.
 *
 * Usage: npx tsx scripts/seed-success-scores.ts
 */

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

async function main() {
  console.log('Seeding Student Success Early Warning data...')

  // Find demo users and course
  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })

  if (!tiana || !katie) {
    console.log('Demo users not found. Run main seed first.')
    process.exit(1)
  }

  // Find TEK-100 course
  const course = await prisma.course.findFirst({
    where: { instructorId: katie.id },
  })

  if (!course) {
    console.log('No course found for Katie. Run main seed first.')
    process.exit(1)
  }

  console.log(`  Course: ${course.courseCode} (${course.id})`)

  // Clean existing data
  await prisma.successIntervention.deleteMany({ where: { alert: { courseId: course.id } } })
  await prisma.successAlert.deleteMany({ where: { courseId: course.id } })
  await prisma.studentSuccessScore.deleteMany({ where: { courseId: course.id } })
  await prisma.successScoreHistory.deleteMany({ where: { courseId: course.id } })

  // Create Tiana's success score (slightly at-risk)
  const tianaScore = await prisma.studentSuccessScore.create({
    data: {
      userId: tiana.id,
      courseId: course.id,
      score: 58,
      previousScore: 72,
      scoreDelta7d: -14,
      trajectory: 'declining',
      loginScore: 65,
      assignmentScore: 40,
      sandyUsageScore: 75,
      studySessionScore: 50,
      conceptMasteryScore: 55,
      commonsScore: 60,
      flashcardScore: 35,
      gradeTrendScore: 48,
      toolEngagementScore: 70,
      contentAccessScore: 60,
      inflectionDetected: true,
      inflectionType: 'gradual_decline',
      inflectionDetectedAt: new Date(),
      baselineScore: 82,
      peakScore: 85,
      daysSinceActive: 2,
    },
  })

  console.log('  Created Tiana success score:', tianaScore.score)

  // Create a CONCERN alert for Tiana
  const alert = await prisma.successAlert.create({
    data: {
      userId: tiana.id,
      courseId: course.id,
      scoreId: tianaScore.id,
      severity: 'CONCERN',
      routeTarget: 'INSTRUCTOR',
      triggerReason: 'Success score: 58/100. Inflection detected: gradual_decline (magnitude: 47%). Primary concerns: flashcardConsistency (35/100), assignmentSubmission (40/100), gradeTrend (48/100).',
      signalBreakdown: [
        { signal: 'flashcardConsistency', score: 35, delta: -20, detail: '8 of 12 flashcards overdue (67%)' },
        { signal: 'assignmentSubmission', score: 40, delta: -15, detail: '2 on-time, 1 late, 1 missing out of 4. Recent: 1 missing in last 3.' },
        { signal: 'gradeTrend', score: 48, delta: -10, detail: 'Recent avg: 72%, Early avg: 85%, Trend: -13.0' },
      ],
      suggestedActions: [
        { action: 'Send personal check-in about missing assignments', reason: 'Multiple assignments missing — may need deadline extension', urgency: 'this_week', type: 'INSTRUCTOR_OUTREACH' },
        { action: 'Sandy nudge to restart study sessions', reason: 'Study habits have dropped off', urgency: 'this_week', type: 'SANDY_NUDGE' },
      ],
      patternType: 'academic_decline',
      confidenceScore: 0.8,
      expiresAt: new Date(Date.now() + 14 * 86400000),
    },
  })

  console.log('  Created alert:', alert.severity, alert.patternType)

  // Create score history (last 30 days)
  const now = Date.now()
  const historyData = []
  for (let day = 30; day >= 0; day--) {
    // Simulate a decline from 82 to 58 over 30 days
    const score = Math.round(82 - (24 * (30 - day) / 30) + (Math.random() * 6 - 3))
    historyData.push({
      userId: tiana.id,
      courseId: course.id,
      score: Math.max(40, Math.min(90, score)),
      trajectory: score > 70 ? 'stable' : score > 55 ? 'declining' : 'critical_decline',
      topSignal: day > 15 ? 'gradeTrend' : 'flashcardConsistency',
      topSignalDelta: day > 15 ? -3 : -5,
      computedAt: new Date(now - day * 86400000),
    })
  }

  await prisma.successScoreHistory.createMany({ data: historyData })
  console.log(`  Created ${historyData.length} history snapshots`)

  // Create a past intervention
  const intervention = await prisma.successIntervention.create({
    data: {
      alertId: alert.id,
      userId: tiana.id,
      initiatorId: katie.id,
      type: 'INSTRUCTOR_OUTREACH',
      notes: 'Sent email checking in about missing assignment. Student replied that they were dealing with a heavy workload in other classes.',
      outcome: 'PARTIAL',
      scoreAtIntervention: 62,
      scoreAtOutcome: 58,
      outcomeDetectedAt: new Date(now - 5 * 86400000),
      reEngagementSignals: {
        scoreBefore: 62,
        scoreAfter: 58,
        delta: -4,
        trajectory: 'declining',
      },
    },
  })

  console.log('  Created intervention:', intervention.type, intervention.outcome)

  // Create Katie's alert preferences
  await prisma.successAlertPreference.upsert({
    where: { userId: katie.id },
    create: {
      userId: katie.id,
      minSeverity: 'CONCERN',
      emailDigest: true,
      briefingInject: true,
      sandyNotify: true,
      batchWindow: 24,
    },
    update: {},
  })

  console.log('  Created alert preferences for Katie')
  console.log('Done!')
}

main().catch(console.error)
