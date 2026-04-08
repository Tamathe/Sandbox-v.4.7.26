/**
 * wellness-hub-preflight.ts
 *
 * Shared preflight for all Wellness Hub elevated tools.
 * Loads user context, recent entries, streak, and academic stress signals.
 */

import { prisma } from './prisma'

export type WellnessToolSlug = 'mindfulness' | 'habits' | 'sleep' | 'journal'

export interface WellnessHubPreflight {
  user: {
    name: string
    email: string
    department: string | null
    college: string | null
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN'
  }
  recentEntries: {
    date: string
    data: Record<string, unknown>
    aiInsight: string | null
  }[]
  yesterdayEntry: {
    date: string
    data: Record<string, unknown>
  } | null
  todayEntry: {
    data: Record<string, unknown>
  } | null
  streak: number
  upcomingDeadlines: {
    title: string
    courseCode: string
    dueAt: string
    daysAway: number
  }[]
}

export async function getWellnessHubPreflight(
  userId: string,
  toolSlug: WellnessToolSlug,
): Promise<WellnessHubPreflight> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const fourteenDaysAgo = new Date(today)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const threeDaysOut = new Date(today)
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)

  const [user, todayEntry, recentEntries, upcomingExams] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, department: true, college: true, role: true },
    }),
    prisma.wellnessEntry
      .findUnique({
        where: { userId_toolSlug_date: { userId, toolSlug, date: today } },
        select: { data: true },
      })
      .catch(() => null),
    prisma.wellnessEntry.findMany({
      where: { userId, toolSlug, date: { gte: fourteenDaysAgo, lt: today } },
      select: { date: true, data: true, aiInsight: true },
      orderBy: { date: 'desc' },
    }),
    prisma.assignment
      .findMany({
        where: {
          course: { enrollments: { some: { studentId: userId } } },
          dueAt: { gte: today, lte: threeDaysOut },
          category: { in: ['exam', 'midterm', 'final', 'quiz'] },
        },
        select: { title: true, dueAt: true, course: { select: { courseCode: true } } },
        take: 5,
      })
      .catch(() => []),
  ])

  // Calculate streak (consecutive days with entries, counting backwards from yesterday)
  let streak = 0
  const checkDate = new Date(yesterday)
  for (const entry of recentEntries) {
    if (entry.date.toISOString().split('T')[0] === checkDate.toISOString().split('T')[0]) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  if (todayEntry) streak++ // Today counts

  const yesterdayEntry = recentEntries.find(
    (e) => e.date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0],
  )

  return {
    user: { ...user, role: user.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN' },
    recentEntries: recentEntries.map((e) => ({
      date: e.date.toISOString().split('T')[0],
      data: e.data as Record<string, unknown>,
      aiInsight: e.aiInsight,
    })),
    yesterdayEntry: yesterdayEntry
      ? { date: yesterday.toISOString().split('T')[0], data: yesterdayEntry.data as Record<string, unknown> }
      : null,
    todayEntry: todayEntry ? { data: todayEntry.data as Record<string, unknown> } : null,
    streak,
    upcomingDeadlines: (upcomingExams as { title: string; dueAt: Date; course: { courseCode: string } }[]).map((a) => ({
      title: a.title,
      courseCode: a.course.courseCode,
      dueAt: a.dueAt.toISOString().split('T')[0],
      daysAway: Math.ceil((a.dueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    })),
  }
}
