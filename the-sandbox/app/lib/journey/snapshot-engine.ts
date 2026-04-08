import { prisma } from '../prisma'
import type { JourneySnapshotData, TrajectoryLabel } from './types'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = start
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  end.setUTCMilliseconds(-1)
  return end
}

export async function computeWeeklySnapshot(userId: string, weekOf: Date): Promise<JourneySnapshotData> {
  const weekStart = startOfWeek(weekOf)
  const weekEnd = endOfWeek(weekOf)
  const range = { gte: weekStart, lte: weekEnd }

  const [
    sessions,
    flashcards,
    concepts,
    messages,
    liveRooms,
    studyGroups,
    submissions,
    sandyTraces,
    interventions,
    wellness,
    activeCourses,
  ] = await Promise.all([
    // ToolSession uses startedAt
    prisma.toolSession.count({ where: { userId, startedAt: range } }),
    // FlashcardState has no lastReviewedAt — use updatedAt as proxy
    prisma.flashcardState.count({ where: { userId, updatedAt: range } }),
    countConceptGains(userId, weekStart, weekEnd),
    // ChannelMessage uses authorId
    prisma.channelMessage.count({ where: { authorId: userId, createdAt: range } }),
    prisma.liveRoomParticipant.count({ where: { userId, joinedAt: range } }),
    prisma.studyGroupMember.count({ where: { userId } }),
    countSubmissions(userId, weekStart, weekEnd),
    prisma.sandyExecutionTrace.count({ where: { userId, startedAt: range } }),
    countInterventions(userId, weekStart, weekEnd),
    prisma.wellnessEntry.count({ where: { userId, createdAt: range } }),
    // CourseEnrollment uses studentId, no role field
    prisma.courseEnrollment.count({ where: { studentId: userId } }),
  ])

  // Compute avg session duration from startedAt/endedAt (no durationMinutes field)
  const sessionRows = await prisma.toolSession.findMany({
    where: { userId, startedAt: range, endedAt: { not: null } },
    select: { startedAt: true, endedAt: true },
  })
  const durations: number[] = sessionRows.map(s => {
    const ms = (s.endedAt as Date).getTime() - s.startedAt.getTime()
    return ms / 60_000
  })
  const avgSessionMinutes = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0
  const totalPlatformMinutes = durations.reduce((a, b) => a + b, 0)

  const topMode = await getTopStudyMode(userId, weekStart, weekEnd)
  const uniqueTools = await countUniqueTools(userId, weekStart, weekEnd)
  const avgGrade = await getAvgGrade(userId, weekStart, weekEnd)
  const engagementScore = computeEngagementScore(sessions, messages, liveRooms, flashcards)
  const trajectoryLabel = await computeTrajectory(userId, weekStart, engagementScore)

  return {
    userId,
    weekOf: weekStart,
    activeCoursesCount: activeCourses,
    avgGrade,
    submissionsOnTime: submissions.onTime,
    submissionsLate: submissions.late,
    studySessions: sessions,
    avgSessionMinutes,
    flashcardsReviewed: flashcards,
    conceptsGained: concepts,
    topStudyMode: topMode,
    messagesSent: messages,
    liveRoomsJoined: liveRooms,
    studyGroupsActive: studyGroups,
    totalPlatformMinutes,
    uniqueToolsUsed: uniqueTools,
    sandyInteractions: sandyTraces,
    nudgesActedOn: interventions.actedOn,
    nudgesReceived: interventions.total,
    wellnessEntryCount: wellness,
    eventsAttended: 0, // No CampusEvent attendance model exists yet
    orgsActive: 0, // No Organization user membership model exists yet
    engagementScore,
    trajectoryLabel,
  }
}

async function countConceptGains(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  // Concepts where masteryLevel crossed 0.7 threshold this week
  const masteries = await prisma.studentConceptMastery.count({
    where: {
      userId,
      masteryLevel: { gte: 0.7 },
      lastSeenAt: { gte: weekStart, lte: weekEnd },
    },
  })
  return masteries
}

async function countSubmissions(userId: string, weekStart: Date, weekEnd: Date): Promise<{ onTime: number; late: number }> {
  const subs = await prisma.submission.findMany({
    where: { studentId: userId, submittedAt: { gte: weekStart, lte: weekEnd } },
    select: { submittedAt: true, assignment: { select: { dueAt: true } } },
  })
  let onTime = 0
  let late = 0
  for (const sub of subs) {
    if (!sub.assignment.dueAt || sub.submittedAt <= sub.assignment.dueAt) {
      onTime++
    } else {
      late++
    }
  }
  return { onTime, late }
}

async function getAvgGrade(userId: string, weekStart: Date, weekEnd: Date): Promise<number | null> {
  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: { studentId: userId, submittedAt: { gte: weekStart, lte: weekEnd } },
      facultyScore: { not: null },
    },
    select: { facultyScore: true, aiScore: true },
  })
  if (entries.length === 0) return null
  const scores: number[] = entries.map(e => e.facultyScore ?? e.aiScore ?? 0)
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

async function countInterventions(userId: string, weekStart: Date, weekEnd: Date): Promise<{ total: number; actedOn: number }> {
  const logs = await prisma.interventionLog.findMany({
    where: { studentId: userId, createdAt: { gte: weekStart, lte: weekEnd } },
    select: { outcome: true, resolvedAt: true },
  })
  return {
    total: logs.length,
    actedOn: logs.filter((l: { resolvedAt: Date | null }) => l.resolvedAt !== null).length,
  }
}

async function getTopStudyMode(userId: string, weekStart: Date, weekEnd: Date): Promise<string | null> {
  // Find the most-used tool by session count this week
  const result = await prisma.toolSession.groupBy({
    by: ['toolId'],
    where: { userId, startedAt: { gte: weekStart, lte: weekEnd } },
    _count: { toolId: true },
    orderBy: { _count: { toolId: 'desc' } },
    take: 1,
  })
  if (result.length === 0) return null
  const tool = await prisma.tool.findUnique({
    where: { id: result[0].toolId },
    select: { name: true },
  })
  return tool?.name ?? null
}

async function countUniqueTools(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const result = await prisma.toolSession.groupBy({
    by: ['toolId'],
    where: { userId, startedAt: { gte: weekStart, lte: weekEnd } },
  })
  return result.length
}

function computeEngagementScore(sessions: number, messages: number, liveRooms: number, flashcards: number): number {
  // Weighted 0-1 composite — caps each dimension
  const sessionScore = Math.min(sessions / 10, 1) * 0.35
  const socialScore = Math.min((messages + liveRooms * 5) / 20, 1) * 0.25
  const studyScore = Math.min(flashcards / 20, 1) * 0.25
  const diversityScore = Math.min((sessions > 0 ? 1 : 0) + (messages > 0 ? 1 : 0) + (flashcards > 0 ? 1 : 0) + (liveRooms > 0 ? 1 : 0), 4) / 4 * 0.15
  return Math.round((sessionScore + socialScore + studyScore + diversityScore) * 100) / 100
}

async function computeTrajectory(userId: string, currentWeekOf: Date, currentScore: number): Promise<TrajectoryLabel> {
  const prevWeek1 = new Date(currentWeekOf)
  prevWeek1.setUTCDate(prevWeek1.getUTCDate() - 7)
  const prevWeek2 = new Date(currentWeekOf)
  prevWeek2.setUTCDate(prevWeek2.getUTCDate() - 14)

  const [prev, prevPrev] = await Promise.all([
    prisma.journeySnapshot.findUnique({ where: { userId_weekOf: { userId, weekOf: prevWeek1 } }, select: { engagementScore: true } }),
    prisma.journeySnapshot.findUnique({ where: { userId_weekOf: { userId, weekOf: prevWeek2 } }, select: { engagementScore: true } }),
  ])

  if (!prev || !prevPrev) return 'insufficient-data'

  const p = prev.engagementScore
  const pp = prevPrev.engagementScore
  const variance = 0.1

  if (currentScore > p + variance && p > pp + variance) return 'ascending'
  if (currentScore > p + variance && p < pp - variance) return 'recovering'
  if (currentScore < p - variance && p > pp + variance) return 'dipping'
  if (currentScore < p - variance && p < pp - variance) return 'declining'
  return 'stable'
}

export async function computeAllWeeklySnapshots(): Promise<{ processed: number; errors: number }> {
  const now = new Date()
  const weekOf = startOfWeek(now)

  // Get all students
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  })

  let processed = 0
  let errors = 0

  for (const student of students) {
    try {
      const data = await computeWeeklySnapshot(student.id, weekOf)
      await prisma.journeySnapshot.upsert({
        where: { userId_weekOf: { userId: student.id, weekOf: data.weekOf } },
        create: data,
        update: data,
      })
      processed++
    } catch (err) {
      console.error(`[Journey] Snapshot failed for user ${student.id}:`, err)
      errors++
    }
  }

  return { processed, errors }
}
