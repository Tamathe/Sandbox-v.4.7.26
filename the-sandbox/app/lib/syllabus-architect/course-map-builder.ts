/**
 * Syllabus Architect — Shared CourseMap Builder
 *
 * Creates a CourseMap with all CourseUnits, MapNodes, and MapEdges in a single
 * transaction. Used by both apply-syllabus (manual) and import-syllabus (auto).
 */

import { prisma } from '../prisma'
import type { ParseResult } from './pdf-parser'
import type { CourseMapUnitType, MapEdgeType } from '../../generated/prisma'
import {
  createAssignmentsFromParse,
  createObjectivesFromParse,
} from './assignment-objective-sync'

export async function createInitialCourseMap(
  courseId: string,
  result: ParseResult,
  jobId: string,
  fileHash: string,
): Promise<{ mapId: string; assignmentsCreated: number; objectivesCreated: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. Create the CourseMap
    const map = await tx.courseMap.create({
      data: { courseId },
    })

    // 2. Create CourseUnits + MapNodes (track label → nodeId for edge wiring)
    const labelToNodeId = new Map<string, string>()

    for (let i = 0; i < result.units.length; i++) {
      const unit = result.units[i]
      const unitType = unit.unitType.toUpperCase() as CourseMapUnitType

      const courseUnit = await tx.courseUnit.create({
        data: {
          courseMapId: map.id,
          label: unit.label,
          description: unit.description,
          unitType,
          startDate: unit.startDate ? new Date(unit.startDate) : null,
          endDate: unit.endDate ? new Date(unit.endDate) : null,
          dateConfidence: unit.dateConfidence,
          rawSourceText: unit.rawSourceText,
          position: i,
          modules: {
            create: unit.modules.map((mod) => ({
              label: mod.label,
              description: mod.description,
              lessons: {
                create: mod.lessons.map((lesson) => ({
                  label: lesson.label,
                  rawSourceText: lesson.rawSourceText,
                  dueDate: lesson.dueDate ? new Date(lesson.dueDate) : null,
                  dateConfidence: lesson.dateConfidence,
                })),
              },
            })),
          },
        },
      })

      const node = await tx.mapNode.create({
        data: {
          courseMapId: map.id,
          courseUnitId: courseUnit.id,
          label: unit.label,
          nodeType: 'UNIT',
          xPos: 0,
          yPos: i * 120,
          archived: false,
        },
      })

      labelToNodeId.set(unit.label.toLowerCase().trim(), node.id)
    }

    // 3. Create MapEdges (match edge labels to node IDs)
    for (const edge of result.edges) {
      const fromId = labelToNodeId.get(edge.fromLabel.toLowerCase().trim())
      const toId = labelToNodeId.get(edge.toLabel.toLowerCase().trim())

      if (fromId && toId) {
        await tx.mapEdge.create({
          data: {
            courseMapId: map.id,
            fromNodeId: fromId,
            toNodeId: toId,
            edgeType: edge.edgeType as MapEdgeType,
          },
        })
      }
    }

    // 4. Create Assignment + LearningObjective records
    const [assignmentsCreated, objectivesCreated] = await Promise.all([
      createAssignmentsFromParse(tx, courseId, result),
      createObjectivesFromParse(tx, courseId, result),
    ])

    // 5. Link the parse job to the new map
    await tx.syllabusParseJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETE',
        courseMapId: map.id,
        fileHash,
      },
    })

    return { mapId: map.id, assignmentsCreated, objectivesCreated }
  })
}
