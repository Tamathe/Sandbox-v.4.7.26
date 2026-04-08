/**
 * Dashboard service — extracted Prisma queries from /api/dashboard route.
 */

import { prisma } from './prisma'
import { subDays } from 'date-fns'

// ─── student ──────────────────────────────────────────────────────────────────

export async function getStudentSessions(userId: string) {
  return prisma.toolSession.findMany({
    where: { userId },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      tool: { select: { id: true, name: true, category: true } },
    },
    orderBy: { startedAt: 'desc' },
  })
}

export async function getStudentUpcomingAssignments(userId: string) {
  return prisma.assignment.findMany({
    where: {
      isPublished: true,
      course: { enrollments: { some: { studentId: userId } } },
      dueAt: { gte: new Date() },
    },
    include: {
      tool: { select: { id: true, name: true } },
      course: { select: { title: true, courseCode: true } },
    },
    orderBy: { dueAt: 'asc' },
    take: 5,
  })
}

export async function getSessionMetrics(sessionIds: string[]) {
  if (sessionIds.length === 0) return []
  return prisma.metricEvent.findMany({
    where: {
      sessionId: { in: sessionIds },
      metricName: { in: ['score', 'topic'] },
    },
    select: { sessionId: true, metricName: true, metricValue: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── educator / admin ─────────────────────────────────────────────────────────

export async function getEducatorTools(userId: string) {
  return prisma.tool.findMany({
    where: { creatorId: userId },
    select: { id: true },
  })
}

export async function getEducatorCourses(userId: string) {
  return prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      id: true,
      courseCode: true,
      title: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getEducatorActivityData(
  myToolIds: string[],
  courseIds: string[],
  thirtyDaysAgo: Date,
  staleQueueThreshold: Date,
) {
  return Promise.all([
    myToolIds.length > 0
      ? prisma.toolSession.findMany({
          where: { toolId: { in: myToolIds }, userId: { not: null }, startedAt: { gte: thirtyDaysAgo }, sensitiveSession: false },
          select: { userId: true },
          distinct: ['userId'],
        })
      : ([] as { userId: string | null }[]),
    myToolIds.length > 0
      ? prisma.toolSession.findMany({
          where: { toolId: { in: myToolIds }, userId: { not: null }, sensitiveSession: false },
          orderBy: { startedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            startedAt: true,
            user: { select: { name: true } },
            tool: { select: { name: true } },
          },
        })
      : ([] as { id: string; startedAt: Date; user: { name: string } | null; tool: { name: string } }[]),
    courseIds.length > 0
      ? prisma.toolSession.findMany({
          where: { courseId: { in: courseIds }, startedAt: { gte: thirtyDaysAgo }, userId: { not: null }, sensitiveSession: false },
          select: { courseId: true, userId: true },
          distinct: ['courseId', 'userId'],
        })
      : ([] as { courseId: string | null; userId: string | null }[]),
    courseIds.length > 0
      ? prisma.studentObjectiveProgress.findMany({
          where: { courseId: { in: courseIds }, masteryLevel: 'struggling' },
          select: { courseId: true, studentId: true },
          distinct: ['courseId', 'studentId'],
        })
      : ([] as { courseId: string; studentId: string }[]),
    courseIds.length > 0
      ? prisma.toolSession.groupBy({
          by: ['courseId'],
          where: { courseId: { in: courseIds }, score: { not: null }, sensitiveSession: false },
          _avg: { score: true },
        })
      : ([] as { courseId: string | null; _avg: { score: number | null } }[]),
    courseIds.length > 0
      ? prisma.studentObjectiveProgress.findMany({
          where: {
            courseId: { in: courseIds },
            OR: [{ masteryLevel: 'struggling' }, { flaggedForReview: true }],
          },
          include: {
            student: { select: { name: true, email: true } },
            objective: { select: { title: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        })
      : ([] as { studentId: string; courseId: string; masteryLevel: string; flaggedForReview: boolean; lastSeen: Date; student: { name: string; email: string }; objective: { title: string } }[]),
    courseIds.length > 0
      ? prisma.gradebookEntry.count({
          where: {
            status: 'AI_DRAFT',
            updatedAt: { lt: staleQueueThreshold },
            submission: {
              assignment: {
                courseId: { in: courseIds },
              },
            },
          },
        })
      : 0,
  ])
}

export async function getScoreEventsForSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return []
  return prisma.metricEvent.findMany({
    where: { sessionId: { in: sessionIds }, metricName: 'score' },
    select: { sessionId: true, metricValue: true },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── admin executive ──────────────────────────────────────────────────────────

export async function getAdminPlatformStats() {
  return Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.toolSession.count({ where: { sensitiveSession: false } }),
    prisma.tool.count({ where: { approvalStatus: { in: ['APPROVED', 'COMMUNITY'] } } }),
    prisma.toolSession.findMany({
      where: { userId: { not: null }, sensitiveSession: false },
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        startedAt: true,
        user: { select: { name: true } },
        tool: { select: { name: true, category: true } },
      },
    }),
    prisma.tool.groupBy({
      by: ['category'],
      where: { approvalStatus: { in: ['APPROVED', 'COMMUNITY'] } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ['studyGroup'],
      where: { role: 'STUDENT', studyGroup: { not: null } },
      _count: { _all: true },
    }),
  ])
}
