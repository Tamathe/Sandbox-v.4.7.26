import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { INACTIVE_DAYS_THRESHOLD } from './student-risk-constants'
import { getInactiveCount } from './course-summary-service'
import type { TabId } from '../components/courses/course-types'

export interface CourseInsight {
  type: string
  message: string
  priority: number
  actionTab?: TabId
}

export async function buildCourseInsights(courseId: string): Promise<CourseInsight[]> {
  const insights: CourseInsight[] = []

  const [
    moduleScores,
    recentSubmissions,
    priorSubmissions,
    inactiveCount,
    highPerformers,
    upcomingAssignments,
  ] = await Promise.all([
    getModuleScores(courseId),
    prisma.submission.count({
      where: {
        assignment: { courseId },
        submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.submission.count({
      where: {
        assignment: { courseId },
        submittedAt: {
          gte: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    getInactiveCount(courseId),
    getHighPerformerCount(courseId),
    prisma.assignment.count({
      where: {
        courseId,
        isPublished: true,
        dueAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ])

  if (moduleScores.length > 0) {
    const lowest = moduleScores.reduce((min, m) => m.avg < min.avg ? m : min, moduleScores[0])
    if (lowest.avg < 80) {
      insights.push({
        type: 'low-module',
        message: `${lowest.title} has the lowest average score (${Math.round(lowest.avg)}%). Consider reviewing the material or offering extra support.`,
        priority: 1,
        actionTab: 'grades',
      })
    }
  }

  const priorWeeklyAvg = priorSubmissions / 2
  if (priorWeeklyAvg > 0 && recentSubmissions < priorWeeklyAvg * 0.7) {
    const dropPct = Math.round((1 - recentSubmissions / priorWeeklyAvg) * 100)
    insights.push({
      type: 'engagement-drop',
      message: `Submissions are down ${dropPct}% this week compared to your recent average.`,
      priority: 2,
      actionTab: 'overview',
    })
  }

  if (inactiveCount > 0) {
    insights.push({
      type: 'inactive',
      message: `${inactiveCount} student${inactiveCount !== 1 ? 's haven\'t' : ' hasn\'t'} been active in over ${INACTIVE_DAYS_THRESHOLD} days.`,
      priority: 3,
      actionTab: 'overview',
    })
  }

  if (highPerformers > 0) {
    insights.push({
      type: 'high-performers',
      message: `${highPerformers} student${highPerformers !== 1 ? 's are' : ' is'} consistently scoring above 95% — ready for enrichment.`,
      priority: 4,
      actionTab: 'grades',
    })
  }

  if (upcomingAssignments >= 3) {
    insights.push({
      type: 'crunch',
      message: `Students have ${upcomingAssignments} assignments due next week. Consider spacing them out.`,
      priority: 5,
      actionTab: 'assignments',
    })
  }

  insights.sort((a, b) => a.priority - b.priority)
  return insights.slice(0, 3)
}

async function getModuleScores(courseId: string): Promise<Array<{ title: string; avg: number }>> {
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: { assignment: { courseId } },
      status: 'RELEASED',
      facultyScore: { not: null },
    },
    select: {
      facultyScore: true,
      submission: { select: { assignment: { select: { id: true, title: true } } } },
    },
  })

  if (entries.length === 0) return []

  const assignmentScores = new Map<string, { title: string; scores: number[] }>()
  for (const e of entries) {
    if (e.facultyScore == null) continue
    const { id, title } = e.submission.assignment
    const existing = assignmentScores.get(id) ?? { title, scores: [] }
    existing.scores.push(e.facultyScore)
    assignmentScores.set(id, existing)
  }

  return Array.from(assignmentScores.values()).map((a) => ({
    title: a.title,
    avg: a.scores.reduce((sum, s) => sum + s, 0) / a.scores.length,
  }))
}

async function getHighPerformerCount(courseId: string): Promise<number> {
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: { assignment: { courseId } },
      status: 'RELEASED',
      facultyScore: { not: null },
    },
    select: {
      facultyScore: true,
      submission: { select: { studentId: true } },
    },
  })

  if (entries.length === 0) return 0

  const studentScores = new Map<string, number[]>()
  for (const e of entries) {
    if (e.facultyScore == null) continue
    const scores = studentScores.get(e.submission.studentId) ?? []
    scores.push(e.facultyScore)
    studentScores.set(e.submission.studentId, scores)
  }

  let count = 0
  for (const scores of studentScores.values()) {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
    if (avg > 95) count++
  }

  return count
}

export async function buildDeepCourseAnalysis(courseId: string): Promise<{ analysis: string; generatedAt: string }> {
  const [gradeDistribution, weeklySubmissions, enrollmentCount, atRiskCount] = await Promise.all([
    prisma.gradebookEntry.findMany({
      where: {
        submission: { assignment: { courseId } },
        status: 'RELEASED',
        facultyScore: { not: null },
      },
      select: {
        facultyScore: true,
        submission: { select: { assignment: { select: { title: true } } } },
      },
    }),
    getWeeklySubmissionCounts(courseId),
    prisma.courseEnrollment.count({ where: { courseId } }),
    getInactiveCount(courseId),
  ])

  const assignmentStats = new Map<string, number[]>()
  for (const e of gradeDistribution) {
    if (e.facultyScore == null) continue
    const title = e.submission.assignment.title
    const scores = assignmentStats.get(title) ?? []
    scores.push(e.facultyScore)
    assignmentStats.set(title, scores)
  }

  const statsText = Array.from(assignmentStats.entries())
    .map(([title, scores]) => {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length
      return `- ${title}: avg ${Math.round(avg)}%, n=${scores.length}`
    })
    .join('\n')

  const timelineText = weeklySubmissions
    .map((w) => `- Week of ${w.weekStart}: ${w.count} submissions`)
    .join('\n')

  const prompt = `You are Sandy, an AI teaching assistant at the University of Kentucky. Analyze this course data and provide 2-3 actionable observations for the instructor. Be specific — reference assignment names and time periods. Keep each observation to one sentence. Be conversational but data-driven.

Course stats:
- ${enrollmentCount} students enrolled
- ${atRiskCount} students at risk (inactive or missed assignments)

Grade distribution by assignment:
${statsText || 'No graded assignments yet.'}

Submission activity (last 4 weeks):
${timelineText || 'No submission data.'}

Respond with only the observations, one per line.`

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const analysis = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  return { analysis, generatedAt: new Date().toISOString() }
}

async function getWeeklySubmissionCounts(courseId: string): Promise<Array<{ weekStart: string; count: number }>> {
  const now = Date.now()

  const weeks = await Promise.all(
    [0, 1, 2, 3].map(async (i) => {
      const weekEnd = new Date(now - i * 7 * 24 * 60 * 60 * 1000)
      const weekStart = new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const count = await prisma.submission.count({
        where: {
          assignment: { courseId },
          submittedAt: { gte: weekStart, lt: weekEnd },
        },
      })
      return { weekStart: weekStart.toISOString().split('T')[0], count }
    })
  )

  return weeks.reverse()
}
