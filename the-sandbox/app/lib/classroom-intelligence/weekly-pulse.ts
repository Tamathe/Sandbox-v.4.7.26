import { prisma } from '../prisma'
import type { Prisma } from '../../generated/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { computeConceptDifficulty, persistDifficultySnapshot } from './concept-difficulty-engine'
import { generateInsightCards, persistInsightCards } from './insight-generator'
import type { WeeklyPulseData, ConceptDifficulty } from './types'

const anthropic = new Anthropic()

// ─── Weekly Pulse Generator ────────────────────────────────────────────────

/** Generate a weekly Teaching Pulse report for a course */
export async function generateWeeklyPulse(courseId: string): Promise<WeeklyPulseData> {
  // 1. Get course with creator info
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { id: true, instructorId: true, title: true },
  })

  // 2. Compute ISO week and year
  const now = new Date()
  const weekNumber = getISOWeekNumber(now)
  const yearNumber = now.getFullYear()
  const weekStart = getWeekStart(now)

  // 3. Compute concept difficulty + persist snapshots
  const difficulties = await computeConceptDifficulty(courseId)
  await persistDifficultySnapshot(courseId, difficulties)

  // 4. Generate + persist insight cards
  const insightCards = await generateInsightCards(courseId, course.instructorId, difficulties)
  await persistInsightCards(courseId, course.instructorId, insightCards)

  // 5. Get CourseFingerprint for engagement (JSON-typed, cast as any)
  const fingerprint = await prisma.courseFingerprint.findFirst({
    where: { courseId },
    orderBy: { computedAt: 'desc' },
  })
  const avgEngagement = fingerprint
    ? (fingerprint as any).avgEngagement ?? fingerprint.avgConsistencyScore ?? null
    : null

  // 6. Query assignments due this week with submission data
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
  const assignments = await prisma.assignment.findMany({
    where: {
      courseId,
      dueAt: { gte: weekStart, lt: weekEnd },
      isPublished: true,
    },
    include: {
      submissions: {
        include: { gradebookEntry: true },
      },
    },
  })

  // 7. Count enrolled students
  const enrolledCount = await prisma.courseEnrollment.count({
    where: { courseId },
  })

  // Compute avg score and submission rate from this week's assignments
  let totalScore = 0
  let scoreCount = 0
  let totalSubmissions = 0
  let totalExpected = 0

  for (const assignment of assignments) {
    totalExpected += enrolledCount
    totalSubmissions += assignment.submissions.length

    for (const sub of assignment.submissions) {
      const entry = sub.gradebookEntry
      if (entry) {
        const score = entry.facultyScore ?? entry.aiScore
        if (score !== null && score !== undefined) {
          totalScore += score
          scoreCount++
        }
      }
    }
  }

  const avgScore = scoreCount > 0 ? totalScore / scoreCount : null
  const submissionRate = totalExpected > 0 ? totalSubmissions / totalExpected : null

  // 8. Compute topStruggle and topImprovement
  const topStruggle = difficulties.length > 0 ? difficulties[0].conceptLabel : null
  const topImprovement = difficulties
    .filter(d => d.delta7d > 0.05)
    .sort((a, b) => b.delta7d - a.delta7d)[0]?.conceptLabel ?? null

  // 9. Count interventions this week
  const interventionCount = await prisma.teachingIntervention.count({
    where: {
      courseId,
      createdAt: { gte: weekStart },
    },
  })

  // 10. Generate narrative via Haiku
  const narrative = await generatePulseNarrative(
    course.title,
    difficulties,
    avgScore,
    submissionRate,
    interventionCount,
  )

  // 11. Upsert TeachingPulse record
  await prisma.teachingPulse.upsert({
    where: {
      courseId_weekNumber_yearNumber: {
        courseId,
        weekNumber,
        yearNumber,
      },
    },
    create: {
      courseId,
      instructorId: course.instructorId,
      weekNumber,
      yearNumber,
      conceptHeatmap: difficulties as unknown as Prisma.InputJsonValue,
      avgEngagement: avgEngagement,
      assignmentsThisWeek: assignments.length,
      avgScore,
      submissionRate,
      topStruggle,
      topImprovement,
      insightCount: insightCards.length,
      interventionCount,
      narrativeSummary: narrative,
    },
    update: {
      conceptHeatmap: difficulties as unknown as Prisma.InputJsonValue,
      avgEngagement: avgEngagement,
      assignmentsThisWeek: assignments.length,
      avgScore,
      submissionRate,
      topStruggle,
      topImprovement,
      insightCount: insightCards.length,
      interventionCount,
      narrativeSummary: narrative,
    },
  })

  // 12. Return WeeklyPulseData
  return {
    courseId,
    weekNumber,
    conceptHeatmap: difficulties,
    avgEngagement,
    avgScore,
    submissionRate,
    topStruggle,
    topImprovement,
    insightCount: insightCards.length,
    interventionCount,
    narrative,
  }
}

/** Generate a 2-3 sentence weekly pulse narrative via Haiku */
export async function generatePulseNarrative(
  courseTitle: string,
  difficulties: ConceptDifficulty[],
  avgScore: number | null,
  submissionRate: number | null,
  interventionCount: number,
): Promise<string> {
  const topStruggles = difficulties
    .filter(d => d.difficulty === 'CRITICAL' || d.difficulty === 'VERY_DIFFICULT' || d.difficulty === 'DIFFICULT')
    .slice(0, 3)
    .map(d => `${d.conceptLabel} (mastery ${Math.round(d.masteryRate * 100)}%)`)

  const topImprovements = difficulties
    .filter(d => d.delta7d > 0.05)
    .sort((a, b) => b.delta7d - a.delta7d)
    .slice(0, 3)
    .map(d => `${d.conceptLabel} (+${Math.round(d.delta7d * 100)}%)`)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Write a 2-3 sentence weekly teaching pulse summary for the course "${courseTitle}".

Key data:
- Average score: ${avgScore !== null ? `${Math.round(avgScore * 100)}%` : 'No scores yet'}
- Submission rate: ${submissionRate !== null ? `${Math.round(submissionRate * 100)}%` : 'No assignments due'}
- Interventions this week: ${interventionCount}
- Top struggles: ${topStruggles.length > 0 ? topStruggles.join(', ') : 'None identified'}
- Top improvements: ${topImprovements.length > 0 ? topImprovements.join(', ') : 'None this week'}

Be concise, actionable, and encouraging. Focus on what matters most for the instructor this week.`,
      },
    ],
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Get ISO week number for a date */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Get the Monday (start) of the ISO week for a date */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
