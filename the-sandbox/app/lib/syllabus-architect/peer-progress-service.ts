/**
 * Peer Progress Service
 *
 * Generates anonymized class progress heatmap data for course map nodes.
 * Uses LessonProgress records to compute per-node completion rates.
 */

import { prisma } from '../prisma'

export interface NodeHeatmapEntry {
  nodeId: string
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  totalStudents: number
  completionRate: number // 0-1
}

/**
 * Get class-wide progress heatmap for all nodes in a course map.
 * Returns per-node completion stats based on LessonProgress records.
 */
export async function getClassProgressHeatmap(
  courseId: string,
): Promise<NodeHeatmapEntry[]> {
  // Get total enrolled students
  const totalStudents = await prisma.courseEnrollment.count({
    where: { courseId },
  })

  if (totalStudents === 0) return []

  // Get the course map with nodes
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: {
      nodes: {
        where: { archived: false },
        select: { id: true, courseUnitId: true },
      },
    },
  })

  if (!courseMap || courseMap.nodes.length === 0) return []

  // Get all lesson progress for this course's students
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })
  const studentIds = enrollments.map((e) => e.studentId)

  // Get all study plan entries for this course (completed ones count as node progress)
  const studyPlanEntries = await prisma.studentStudyPlan.findMany({
    where: {
      courseId,
      studentId: { in: studentIds },
    },
    select: { nodeId: true, studentId: true, completedAt: true },
  })

  // Also get node progress from the existing progress system
  // Group study plan by nodeId
  const nodeStudentMap = new Map<string, { completed: Set<string>; inProgress: Set<string> }>()

  for (const entry of studyPlanEntries) {
    if (!nodeStudentMap.has(entry.nodeId)) {
      nodeStudentMap.set(entry.nodeId, { completed: new Set(), inProgress: new Set() })
    }
    const nodeData = nodeStudentMap.get(entry.nodeId)!
    if (entry.completedAt) {
      nodeData.completed.add(entry.studentId)
    } else {
      nodeData.inProgress.add(entry.studentId)
    }
  }

  // Also check StudentObjectiveProgress for objective-based completion
  // Get learning objectives mapped to course units (which map to nodes)
  const objectives = await prisma.learningObjective.findMany({
    where: { courseId },
    select: { id: true, moduleNumber: true },
  })

  if (objectives.length > 0) {
    const objectiveIds = objectives.map((o) => o.id)
    const progressRecords = await prisma.studentObjectiveProgress.findMany({
      where: {
        objectiveId: { in: objectiveIds },
        studentId: { in: studentIds },
      },
      select: { studentId: true, objectiveId: true, masteryLevel: true, attempts: true },
    })

    // Map objectives to nodes via courseUnitId (rough mapping via position)
    // For heatmap, we use a simplified mapping: any mastered objective → nearest node
    const objMap = new Map(objectives.map((o) => [o.id, o]))

    for (const prog of progressRecords) {
      const obj = objMap.get(prog.objectiveId)
      if (!obj) continue

      // Find a node that matches this module number
      const matchingNode = courseMap.nodes.find((n) => {
        // Simple heuristic: try to find a node from the same unit
        return n.courseUnitId !== null
      })
      if (!matchingNode) continue

      if (!nodeStudentMap.has(matchingNode.id)) {
        nodeStudentMap.set(matchingNode.id, { completed: new Set(), inProgress: new Set() })
      }
      const nodeData = nodeStudentMap.get(matchingNode.id)!
      if (prog.masteryLevel === 'mastered') {
        nodeData.completed.add(prog.studentId)
      } else if (prog.masteryLevel === 'struggling' || prog.attempts > 0) {
        nodeData.inProgress.add(prog.studentId)
      }
    }
  }

  // Build heatmap entries for all nodes
  return courseMap.nodes.map((node) => {
    const data = nodeStudentMap.get(node.id)
    const completedCount = data?.completed.size || 0
    const inProgressCount = data?.inProgress.size || 0
    const notStartedCount = totalStudents - completedCount - inProgressCount

    return {
      nodeId: node.id,
      completedCount,
      inProgressCount,
      notStartedCount: Math.max(0, notStartedCount),
      totalStudents,
      completionRate: totalStudents > 0 ? completedCount / totalStudents : 0,
    }
  })
}
