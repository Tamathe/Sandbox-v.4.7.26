/**
 * Course milestone service for achievement tracking.
 *
 * Educators define milestones on course map nodes. Students see progress
 * markers and get a brief celebration when completing one.
 * Not gamification — no points, no leaderboards, just motivational markers.
 */

import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MilestoneData {
  id: string
  courseId: string
  nodeId: string
  nodeLabel: string | null
  label: string
  description: string | null
  position: number
  achieved: boolean
  achievedAt: string | null
}

export interface MilestoneSummary {
  total: number
  achieved: number
  milestones: MilestoneData[]
}

export interface NewlyAchieved {
  milestoneId: string
  label: string
  nodeLabel: string | null
}

// ── Educator operations ──────────────────────────────────────────────────────

/**
 * Define a milestone on a course map node.
 * Upserts: if a milestone already exists for this courseId+nodeId, it updates it.
 */
export async function defineMilestone(
  courseId: string,
  nodeId: string,
  label: string,
  description?: string,
): Promise<MilestoneData> {
  const ms = await prisma.courseMilestone.upsert({
    where: { courseId_nodeId: { courseId, nodeId } },
    create: {
      courseId,
      nodeId,
      label,
      description: description ?? null,
      position: 0,
    },
    update: {
      label,
      description: description ?? null,
    },
  })

  const node = await prisma.mapNode.findFirst({
    where: { id: nodeId },
    select: { label: true },
  })

  return {
    id: ms.id,
    courseId: ms.courseId,
    nodeId: ms.nodeId,
    nodeLabel: node?.label ?? null,
    label: ms.label,
    description: ms.description,
    position: ms.position,
    achieved: false,
    achievedAt: null,
  }
}

/**
 * Remove a milestone from a node.
 */
export async function removeMilestone(courseId: string, nodeId: string): Promise<boolean> {
  try {
    await prisma.courseMilestone.delete({
      where: { courseId_nodeId: { courseId, nodeId } },
    })
    return true
  } catch {
    return false
  }
}

// ── Read operations ──────────────────────────────────────────────────────────

/**
 * Get all milestones for a course, optionally with a student's completion status.
 */
export async function getMilestones(
  courseId: string,
  studentId?: string,
): Promise<MilestoneSummary> {
  const milestones = await prisma.courseMilestone.findMany({
    where: { courseId },
    include: {
      studentMilestones: studentId
        ? { where: { studentId }, take: 1 }
        : false,
    },
    orderBy: { position: 'asc' },
  })

  // Batch fetch node labels
  const nodeIds = milestones.map((m) => m.nodeId)
  const nodes = await prisma.mapNode.findMany({
    where: { id: { in: nodeIds } },
    select: { id: true, label: true },
  })
  const nodeMap = new Map(nodes.map((n) => [n.id, n.label]))

  const result: MilestoneData[] = milestones.map((ms) => {
    const achieved = Array.isArray(ms.studentMilestones) && ms.studentMilestones.length > 0
    return {
      id: ms.id,
      courseId: ms.courseId,
      nodeId: ms.nodeId,
      nodeLabel: nodeMap.get(ms.nodeId) ?? null,
      label: ms.label,
      description: ms.description,
      position: ms.position,
      achieved,
      achievedAt: achieved ? ms.studentMilestones[0].achievedAt.toISOString() : null,
    }
  })

  return {
    total: result.length,
    achieved: result.filter((m) => m.achieved).length,
    milestones: result,
  }
}

/**
 * Get just the student's milestone progress.
 */
export async function getStudentMilestones(
  courseId: string,
  studentId: string,
): Promise<MilestoneSummary> {
  return getMilestones(courseId, studentId)
}

// ── Completion check ─────────────────────────────────────────────────────────

/**
 * Check if a student has newly completed any milestones based on their study plan.
 * Returns list of newly achieved milestones (ones just marked now).
 */
export async function checkMilestoneCompletion(
  courseId: string,
  studentId: string,
): Promise<NewlyAchieved[]> {
  // Get all milestones for the course
  const milestones = await prisma.courseMilestone.findMany({
    where: { courseId },
    select: { id: true, nodeId: true, label: true },
  })

  if (milestones.length === 0) return []

  // Get already achieved
  const achieved = await prisma.studentMilestone.findMany({
    where: {
      studentId,
      milestoneId: { in: milestones.map((m) => m.id) },
    },
    select: { milestoneId: true },
  })
  const achievedIds = new Set(achieved.map((a) => a.milestoneId))

  // Get student's completed study plan nodes
  const plans = await prisma.studentStudyPlan.findMany({
    where: {
      courseId,
      studentId,
      completedAt: { not: null },
    },
    select: { nodeId: true },
  })
  const completedNodeIds = new Set(plans.map((p) => p.nodeId))

  // Find milestones whose node is completed but not yet achieved
  const newlyAchieved: NewlyAchieved[] = []
  const nodeIds = milestones.map((m) => m.nodeId)
  const nodes = await prisma.mapNode.findMany({
    where: { id: { in: nodeIds } },
    select: { id: true, label: true },
  })
  const nodeMap = new Map(nodes.map((n) => [n.id, n.label]))

  for (const ms of milestones) {
    if (achievedIds.has(ms.id)) continue
    if (!completedNodeIds.has(ms.nodeId)) continue

    // Mark as achieved
    try {
      await prisma.studentMilestone.create({
        data: { milestoneId: ms.id, studentId },
      })
      newlyAchieved.push({
        milestoneId: ms.id,
        label: ms.label,
        nodeLabel: nodeMap.get(ms.nodeId) ?? null,
      })
    } catch {
      // Already achieved (race condition)
    }
  }

  return newlyAchieved
}

/**
 * Get milestone node IDs for a course (for canvas badge rendering).
 */
export async function getMilestoneNodeIds(courseId: string): Promise<Set<string>> {
  const milestones = await prisma.courseMilestone.findMany({
    where: { courseId },
    select: { nodeId: true },
  })
  return new Set(milestones.map((m) => m.nodeId))
}
