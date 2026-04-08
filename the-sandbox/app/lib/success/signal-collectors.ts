import { prisma } from '../prisma'
import { MASTERY_STALE_DAYS, MISSED_ASSIGNMENT_CAP_THRESHOLD, MISSED_ASSIGNMENT_SCORE_CAP } from '../student-risk-constants'

interface SignalResult {
  score: number
  detail: string
  rawMetrics: Record<string, number>
}

/** Login frequency score: compares recent 7d logins against 30d baseline */
export async function computeLoginScore(userId: string, _courseId: string): Promise<SignalResult> {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)
  const d30 = new Date(now.getTime() - 30 * 86400000)

  const [recent7d, baseline30d] = await Promise.all([
    prisma.toolSession.findMany({
      where: { userId, startedAt: { gte: d7 } },
      select: { startedAt: true },
    }),
    prisma.toolSession.findMany({
      where: { userId, startedAt: { gte: d30, lt: d7 } },
      select: { startedAt: true },
    }),
  ])

  const recentDays = new Set(recent7d.map(s => s.startedAt.toISOString().slice(0, 10))).size
  const baselineDays = new Set(baseline30d.map(s => s.startedAt.toISOString().slice(0, 10))).size
  const baselineRate = baselineDays / 23
  const recentRate = recentDays / 7

  const ratio = baselineRate > 0 ? recentRate / baselineRate : recentRate > 0 ? 1 : 0
  const score = Math.round(Math.min(100, ratio * 100))

  return {
    score,
    detail: `${recentDays} active days in last 7d (baseline: ${(baselineRate * 7).toFixed(1)} days/week)`,
    rawMetrics: { recentDays, baselineDays, recentRate, baselineRate },
  }
}

/** Assignment submission score: on-time/late/missing pattern */
export async function computeAssignmentScore(userId: string, courseId: string): Promise<SignalResult> {
  const assignments = await prisma.assignment.findMany({
    where: { courseId, dueAt: { lte: new Date() } },
    include: {
      submissions: { where: { studentId: userId } },
    },
    orderBy: { dueAt: 'desc' },
    take: 10,
  })

  let onTime = 0, late = 0, missing = 0
  for (const a of assignments) {
    if (a.submissions.length === 0) {
      missing++
    } else {
      const sub = a.submissions[0]
      if (a.dueAt && sub.submittedAt <= a.dueAt) {
        onTime++
      } else {
        late++
      }
    }
  }

  const total = assignments.length
  if (total === 0) return { score: 80, detail: 'No assignments due yet', rawMetrics: {} }

  const score = Math.round(((onTime + late * 0.5) / total) * 100)
  const recent3 = assignments.slice(0, 3)
  const recentMissing = recent3.filter(a => a.submissions.length === 0).length

  return {
    score: recentMissing >= MISSED_ASSIGNMENT_CAP_THRESHOLD ? Math.min(score, MISSED_ASSIGNMENT_SCORE_CAP) : score,
    detail: `${onTime} on-time, ${late} late, ${missing} missing out of ${total}. Recent: ${recentMissing} missing in last 3.`,
    rawMetrics: { onTime, late, missing, total, recentMissing },
  }
}

/** Sandy usage decay: conversation frequency compared to personal baseline */
export async function computeSandyUsageScore(userId: string, _courseId: string): Promise<SignalResult> {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)
  const d30 = new Date(now.getTime() - 30 * 86400000)

  const [recent, baseline] = await Promise.all([
    prisma.toolSession.count({ where: { userId, startedAt: { gte: d7 } } }),
    prisma.toolSession.count({ where: { userId, startedAt: { gte: d30, lt: d7 } } }),
  ])

  const baselineWeekly = baseline / 3.29
  const ratio = baselineWeekly > 0 ? recent / baselineWeekly : recent > 0 ? 1 : 0.5
  const score = Math.round(Math.min(100, ratio * 100))

  return {
    score,
    detail: `${recent} sessions this week (baseline: ${baselineWeekly.toFixed(1)}/week)`,
    rawMetrics: { recent, baseline, baselineWeekly },
  }
}

/** Study session cadence: Study Buddy usage pattern */
export async function computeStudySessionScore(userId: string, _courseId: string): Promise<SignalResult> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  const sessions = await prisma.toolSession.findMany({
    where: {
      userId,
      startedAt: { gte: d14 },
      tool: { name: { contains: 'Study Buddy', mode: 'insensitive' } },
    },
    orderBy: { startedAt: 'desc' },
  })

  const sessionsPerWeek = sessions.length / 2
  const score = Math.round(Math.min(100, sessionsPerWeek >= 2 ? 100 : sessionsPerWeek >= 1 ? 70 : sessionsPerWeek > 0 ? 50 : 30))

  return {
    score,
    detail: `${sessions.length} study sessions in last 14 days (${sessionsPerWeek.toFixed(1)}/week)`,
    rawMetrics: { sessionCount: sessions.length, sessionsPerWeek },
  }
}

/** Concept mastery slope: are mastery scores improving or declining? */
export async function computeConceptMasteryScore(userId: string, courseId: string): Promise<SignalResult> {
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId, coursesEncountered: { has: courseId } },
    orderBy: { lastSeenAt: 'desc' },
  })

  if (masteries.length === 0) return { score: 70, detail: 'No concept mastery data yet', rawMetrics: {} }

  const avgMastery = masteries.reduce((sum, m) => sum + m.masteryLevel, 0) / masteries.length
  const recentlyActive = masteries.filter(m => {
    const daysSinceUpdate = (Date.now() - m.lastSeenAt.getTime()) / 86400000
    return daysSinceUpdate < MASTERY_STALE_DAYS
  })
  const improving = recentlyActive.filter(m => m.successCount > m.encounterCount * 0.6).length
  const declining = recentlyActive.filter(m => m.successCount < m.encounterCount * 0.4).length

  const trendBonus = (improving - declining) * 5
  const score = Math.round(Math.min(100, Math.max(0, avgMastery * 100 + trendBonus)))

  return {
    score,
    detail: `Avg mastery: ${(avgMastery * 100).toFixed(0)}% across ${masteries.length} concepts. ${improving} improving, ${declining} declining.`,
    rawMetrics: { avgMastery, conceptCount: masteries.length, improving, declining },
  }
}

/** Commons participation: social engagement signal */
export async function computeCommonsScore(userId: string, _courseId: string): Promise<SignalResult> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  const participations = await prisma.liveRoomParticipant.count({
    where: {
      userId,
      joinedAt: { gte: d14 },
    },
  })

  const score = participations >= 4 ? 100 : participations >= 2 ? 80 : participations >= 1 ? 60 : 40

  return {
    score,
    detail: `${participations} Commons sessions in last 14 days`,
    rawMetrics: { participations },
  }
}

/** Flashcard consistency: SR review adherence */
export async function computeFlashcardScore(userId: string, _courseId: string): Promise<SignalResult> {
  const now = new Date()

  const cards = await prisma.flashcardState.findMany({
    where: { userId },
  })

  if (cards.length === 0) return { score: 70, detail: 'No flashcards yet', rawMetrics: {} }

  const overdue = cards.filter(c => c.nextReviewAt && c.nextReviewAt < now).length
  const total = cards.length
  const overdueRatio = overdue / total

  const score = Math.round(Math.max(0, (1 - overdueRatio) * 100))

  return {
    score,
    detail: `${overdue} of ${total} flashcards overdue (${(overdueRatio * 100).toFixed(0)}%)`,
    rawMetrics: { overdue, total, overdueRatio },
  }
}

/** Grade trend: rolling average direction */
export async function computeGradeTrendScore(userId: string, courseId: string): Promise<SignalResult> {
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: { studentId: userId, assignment: { courseId } },
      facultyScore: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    select: { facultyScore: true, aiScore: true, createdAt: true },
  })

  if (entries.length < 2) return { score: 75, detail: 'Insufficient grade data for trend', rawMetrics: {} }

  const scores = entries.map(e => e.facultyScore ?? e.aiScore ?? 0)
  const n = scores.length
  const avgScore = scores.reduce((a, b) => a + b, 0) / n

  const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length)
  const earlyAvg = scores.slice(0, Math.ceil(n / 2)).reduce((a, b) => a + b, 0) / Math.ceil(n / 2)

  const trend = recentAvg - earlyAvg
  const score = Math.round(Math.min(100, Math.max(0, avgScore + trend * 2)))

  return {
    score,
    detail: `Recent avg: ${recentAvg.toFixed(0)}%, Early avg: ${earlyAvg.toFixed(0)}%, Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}`,
    rawMetrics: { avgScore, recentAvg, earlyAvg, trend, entryCount: n },
  }
}

/** Tool engagement: breadth and depth of platform tool usage */
export async function computeToolEngagementScore(userId: string, _courseId: string): Promise<SignalResult> {
  const now = new Date()
  const d14 = new Date(now.getTime() - 14 * 86400000)

  const sessions = await prisma.toolSession.findMany({
    where: { userId, startedAt: { gte: d14 } },
    select: { toolId: true, messageCount: true },
  })

  const uniqueTools = new Set(sessions.map(s => s.toolId)).size
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0)

  const breadthScore = Math.min(50, uniqueTools * 10)
  const depthScore = Math.min(50, totalMessages * 2)
  const score = breadthScore + depthScore

  return {
    score: Math.round(Math.min(100, score)),
    detail: `${uniqueTools} unique tools, ${totalMessages} total messages in last 14 days`,
    rawMetrics: { uniqueTools, totalMessages, sessionCount: sessions.length },
  }
}

/** Content access: course material view frequency */
export async function computeContentAccessScore(userId: string, courseId: string): Promise<SignalResult> {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)

  const views = await prisma.materialReadStatus.count({
    where: {
      userId,
      material: { courseId },
      readAt: { gte: d7 },
    },
  })

  const score = views >= 10 ? 100 : views >= 5 ? 80 : views >= 2 ? 60 : views > 0 ? 40 : 20

  return {
    score,
    detail: `${views} material views in last 7 days`,
    rawMetrics: { views },
  }
}
