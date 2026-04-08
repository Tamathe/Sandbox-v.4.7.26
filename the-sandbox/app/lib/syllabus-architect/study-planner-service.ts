/**
 * Student Study Planner Service
 *
 * Lets students mark course map nodes as "planned" with target dates,
 * creating a personal study schedule overlay.
 */

import { prisma } from '../prisma'

export interface StudyPlanEntry {
  id: string
  nodeId: string
  targetDate: string
  completedAt: string | null
  status: 'planned' | 'overdue' | 'completed'
}

export interface StudyPlanStats {
  planned: number
  completed: number
  overdue: number
}

/**
 * Get a student's study plan for a course.
 */
export async function getStudyPlan(
  userId: string,
  courseId: string,
): Promise<StudyPlanEntry[]> {
  const entries = await prisma.studentStudyPlan.findMany({
    where: { studentId: userId, courseId },
    orderBy: { targetDate: 'asc' },
  })

  const now = new Date()
  return entries.map((e) => ({
    id: e.id,
    nodeId: e.nodeId,
    targetDate: e.targetDate.toISOString(),
    completedAt: e.completedAt?.toISOString() || null,
    status: e.completedAt
      ? 'completed'
      : e.targetDate < now
        ? 'overdue'
        : 'planned',
  }))
}

/**
 * Create or update a study plan entry.
 */
export async function setPlanEntry(
  userId: string,
  courseId: string,
  nodeId: string,
  targetDate: Date,
): Promise<StudyPlanEntry> {
  const entry = await prisma.studentStudyPlan.upsert({
    where: {
      studentId_courseId_nodeId: { studentId: userId, courseId, nodeId },
    },
    create: {
      studentId: userId,
      courseId,
      nodeId,
      targetDate,
    },
    update: {
      targetDate,
    },
  })

  const now = new Date()
  return {
    id: entry.id,
    nodeId: entry.nodeId,
    targetDate: entry.targetDate.toISOString(),
    completedAt: entry.completedAt?.toISOString() || null,
    status: entry.completedAt
      ? 'completed'
      : entry.targetDate < now
        ? 'overdue'
        : 'planned',
  }
}

/**
 * Remove a study plan entry.
 */
export async function removePlanEntry(
  userId: string,
  courseId: string,
  nodeId: string,
): Promise<boolean> {
  try {
    await prisma.studentStudyPlan.delete({
      where: {
        studentId_courseId_nodeId: { studentId: userId, courseId, nodeId },
      },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Mark a study plan entry as completed.
 */
export async function markPlanComplete(
  userId: string,
  courseId: string,
  nodeId: string,
): Promise<boolean> {
  try {
    await prisma.studentStudyPlan.update({
      where: {
        studentId_courseId_nodeId: { studentId: userId, courseId, nodeId },
      },
      data: { completedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Get study plan stats for a student/course.
 */
export async function getStudyPlanStats(
  userId: string,
  courseId: string,
): Promise<StudyPlanStats> {
  const entries = await prisma.studentStudyPlan.findMany({
    where: { studentId: userId, courseId },
    select: { targetDate: true, completedAt: true },
  })

  const now = new Date()
  let planned = 0
  let completed = 0
  let overdue = 0

  for (const e of entries) {
    if (e.completedAt) {
      completed++
    } else if (e.targetDate < now) {
      overdue++
    } else {
      planned++
    }
  }

  return { planned, completed, overdue }
}
