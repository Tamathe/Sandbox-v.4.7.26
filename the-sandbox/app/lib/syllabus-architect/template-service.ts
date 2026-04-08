/**
 * Course Map template + duplication service.
 *
 * Templates serialize a course map's graph (nodes, edges, units, modules,
 * lessons) into a reusable JSON blob. Creating a map from a template
 * regenerates all IDs and remaps FK references.
 */

import { randomUUID } from 'crypto'
import { prisma } from '../prisma'
import { Prisma, CourseMapUnitType, MapNodeType, MapEdgeType } from '../../generated/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

interface TemplateNode {
  id: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

interface TemplateEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface TemplateUnit {
  id: string
  label: string
  description: string | null
  unitType: string
  position: number
  modules: TemplateModule[]
}

interface TemplateModule {
  id: string
  courseUnitId: string
  label: string
  description: string | null
  lessons: TemplateLesson[]
}

interface TemplateLesson {
  id: string
  courseModuleId: string
  label: string
  rawSourceText: string | null
}

export interface TemplateGraphData {
  nodes: TemplateNode[]
  edges: TemplateEdge[]
  units: TemplateUnit[]
}

export interface TemplateSummary {
  id: string
  name: string
  description: string | null
  category: string | null
  createdById: string
  createdAt: string
  nodeCount: number
  edgeCount: number
  unitCount: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function newId(): string {
  // Generate a cuid-length unique ID
  return randomUUID().replace(/-/g, '').slice(0, 25)
}

function buildIdMap(oldIds: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const old of oldIds) {
    map.set(old, newId())
  }
  return map
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Serialize a course map into a reusable template.
 */
export async function saveAsTemplate(
  courseMapId: string,
  name: string,
  description: string | null,
  category: string | null,
  userId: string,
): Promise<TemplateSummary> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { id: courseMapId },
    include: {
      nodes: true,
      edges: true,
      units: {
        include: {
          modules: {
            include: { lessons: true },
          },
        },
      },
    },
  })
  if (!courseMap) throw new Error('Course map not found')

  const graphData: TemplateGraphData = {
    nodes: courseMap.nodes.map((n) => ({
      id: n.id,
      courseUnitId: n.courseUnitId,
      label: n.label,
      nodeType: n.nodeType,
      xPos: n.xPos,
      yPos: n.yPos,
      archived: n.archived,
    })),
    edges: courseMap.edges.map((e) => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      edgeType: e.edgeType,
    })),
    units: courseMap.units.map((u) => ({
      id: u.id,
      label: u.label,
      description: u.description,
      unitType: u.unitType,
      position: u.position,
      modules: u.modules.map((m) => ({
        id: m.id,
        courseUnitId: m.courseUnitId,
        label: m.label,
        description: m.description,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          courseModuleId: l.courseModuleId,
          label: l.label,
          rawSourceText: l.rawSourceText,
        })),
      })),
    })),
  }

  const template = await prisma.courseMapTemplate.create({
    data: {
      name,
      description,
      category,
      graphJson: graphData as unknown as Prisma.InputJsonValue,
      createdById: userId,
    },
  })

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    createdById: template.createdById,
    createdAt: template.createdAt.toISOString(),
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
    unitCount: graphData.units.length,
  }
}

/**
 * List templates — optionally filter by user.
 */
export async function listTemplates(userId?: string): Promise<TemplateSummary[]> {
  const templates = await prisma.courseMapTemplate.findMany({
    where: userId ? { createdById: userId } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      createdById: true,
      createdAt: true,
      graphJson: true,
    },
  })

  return templates.map((t) => {
    const data = t.graphJson as unknown as TemplateGraphData | null
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      createdById: t.createdById,
      createdAt: t.createdAt.toISOString(),
      nodeCount: data?.nodes?.length ?? 0,
      edgeCount: data?.edges?.length ?? 0,
      unitCount: data?.units?.length ?? 0,
    }
  })
}

/**
 * Get a single template with full graph data.
 */
export async function getTemplate(templateId: string) {
  const template = await prisma.courseMapTemplate.findUnique({
    where: { id: templateId },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
  if (!template) throw new Error('Template not found')

  const data = template.graphJson as unknown as TemplateGraphData
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    createdById: template.createdById,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    graphData: data,
    nodeCount: data?.nodes?.length ?? 0,
    edgeCount: data?.edges?.length ?? 0,
    unitCount: data?.units?.length ?? 0,
  }
}

/**
 * Delete a template — only owner or admin.
 */
export async function deleteTemplate(
  templateId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  const template = await prisma.courseMapTemplate.findUnique({
    where: { id: templateId },
    select: { createdById: true },
  })
  if (!template) throw new Error('Template not found')
  if (template.createdById !== userId && !isAdmin) {
    throw new Error('Only the template owner or an admin can delete this template')
  }
  await prisma.courseMapTemplate.delete({ where: { id: templateId } })
}

/**
 * Create a new course map from a template.
 * Generates fresh IDs for all entities and remaps FK references.
 */
export async function createMapFromTemplate(
  templateId: string,
  courseId: string,
): Promise<{ mapId: string; nodeCount: number; edgeCount: number; unitCount: number }> {
  const template = await prisma.courseMapTemplate.findUnique({
    where: { id: templateId },
  })
  if (!template) throw new Error('Template not found')

  const data = template.graphJson as unknown as TemplateGraphData
  if (!data?.nodes || !data?.edges) throw new Error('Invalid template data')

  // Check if course already has a map
  const existing = await prisma.courseMap.findUnique({ where: { courseId } })
  if (existing) throw new Error('Course already has a map. Delete it first or use duplication with overwrite.')

  // Build ID remapping tables
  const unitIdMap = buildIdMap(data.units?.map((u) => u.id) ?? [])
  const moduleIdMap = new Map<string, string>()
  const lessonIdMap = new Map<string, string>()
  for (const unit of data.units ?? []) {
    for (const mod of unit.modules) {
      moduleIdMap.set(mod.id, newId())
      for (const lesson of mod.lessons) {
        lessonIdMap.set(lesson.id, newId())
      }
    }
  }
  const nodeIdMap = buildIdMap(data.nodes.map((n) => n.id))
  const edgeIdMap = buildIdMap(data.edges.map((e) => e.id))

  await prisma.$transaction(async (tx) => {
    // Create the CourseMap
    const map = await tx.courseMap.create({
      data: { courseId },
    })

    // Create units
    for (const unit of data.units ?? []) {
      await tx.courseUnit.create({
        data: {
          id: unitIdMap.get(unit.id)!,
          courseMapId: map.id,
          label: unit.label,
          description: unit.description,
          unitType: unit.unitType as CourseMapUnitType,
          position: unit.position,
        },
      })

      // Create modules for this unit
      for (const mod of unit.modules) {
        await tx.courseModule.create({
          data: {
            id: moduleIdMap.get(mod.id)!,
            courseUnitId: unitIdMap.get(unit.id)!,
            label: mod.label,
            description: mod.description,
          },
        })

        // Create lessons for this module
        for (const lesson of mod.lessons) {
          await tx.courseLessonItem.create({
            data: {
              id: lessonIdMap.get(lesson.id)!,
              courseModuleId: moduleIdMap.get(mod.id)!,
              label: lesson.label,
              rawSourceText: lesson.rawSourceText,
            },
          })
        }
      }
    }

    // Create nodes — remap courseUnitId
    for (const node of data.nodes) {
      await tx.mapNode.create({
        data: {
          id: nodeIdMap.get(node.id)!,
          courseMapId: map.id,
          courseUnitId: node.courseUnitId ? unitIdMap.get(node.courseUnitId) ?? null : null,
          label: node.label,
          nodeType: node.nodeType as MapNodeType,
          xPos: node.xPos,
          yPos: node.yPos,
          archived: node.archived,
        },
      })
    }

    // Create edges — remap fromNodeId/toNodeId
    for (const edge of data.edges) {
      await tx.mapEdge.create({
        data: {
          id: edgeIdMap.get(edge.id)!,
          courseMapId: map.id,
          fromNodeId: nodeIdMap.get(edge.fromNodeId)!,
          toNodeId: nodeIdMap.get(edge.toNodeId)!,
          edgeType: edge.edgeType as MapEdgeType,
        },
      })
    }
  })

  return {
    mapId: courseId,
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    unitCount: data.units?.length ?? 0,
  }
}

/**
 * Duplicate an entire course map (nodes, edges, units, modules, lessons)
 * from one course to another.
 */
export async function duplicateMap(
  sourceCourseId: string,
  targetCourseId: string,
  overwrite: boolean = false,
): Promise<{ nodeCount: number; edgeCount: number; unitCount: number }> {
  // Load source map with all nested data
  const sourceMap = await prisma.courseMap.findUnique({
    where: { courseId: sourceCourseId },
    include: {
      nodes: true,
      edges: true,
      units: {
        include: {
          modules: {
            include: { lessons: true },
          },
        },
      },
    },
  })
  if (!sourceMap) throw new Error('Source course map not found')

  // Check target
  const existingTarget = await prisma.courseMap.findUnique({ where: { courseId: targetCourseId } })
  if (existingTarget && !overwrite) {
    throw new Error('OVERWRITE_REQUIRED')
  }

  // Build ID remapping
  const unitIdMap = buildIdMap(sourceMap.units.map((u) => u.id))
  const moduleIdMap = new Map<string, string>()
  const lessonIdMap = new Map<string, string>()
  for (const unit of sourceMap.units) {
    for (const mod of unit.modules) {
      moduleIdMap.set(mod.id, newId())
      for (const lesson of mod.lessons) {
        lessonIdMap.set(lesson.id, newId())
      }
    }
  }
  const nodeIdMap = buildIdMap(sourceMap.nodes.map((n) => n.id))

  await prisma.$transaction(async (tx) => {
    // If overwriting, delete existing target map (cascade deletes nodes/edges/units)
    if (existingTarget) {
      await tx.courseMap.delete({ where: { courseId: targetCourseId } })
    }

    // Create new map for target course
    const newMap = await tx.courseMap.create({
      data: { courseId: targetCourseId },
    })

    // Create units
    for (const unit of sourceMap.units) {
      await tx.courseUnit.create({
        data: {
          id: unitIdMap.get(unit.id)!,
          courseMapId: newMap.id,
          label: unit.label,
          description: unit.description,
          unitType: unit.unitType,
          position: unit.position,
          startDate: unit.startDate,
          endDate: unit.endDate,
          dateConfidence: unit.dateConfidence,
          rawSourceText: unit.rawSourceText,
        },
      })

      for (const mod of unit.modules) {
        await tx.courseModule.create({
          data: {
            id: moduleIdMap.get(mod.id)!,
            courseUnitId: unitIdMap.get(unit.id)!,
            label: mod.label,
            description: mod.description,
          },
        })

        for (const lesson of mod.lessons) {
          await tx.courseLessonItem.create({
            data: {
              id: lessonIdMap.get(lesson.id)!,
              courseModuleId: moduleIdMap.get(mod.id)!,
              label: lesson.label,
              rawSourceText: lesson.rawSourceText,
              dueDate: lesson.dueDate,
              dateConfidence: lesson.dateConfidence,
            },
          })
        }
      }
    }

    // Create nodes
    for (const node of sourceMap.nodes) {
      await tx.mapNode.create({
        data: {
          id: nodeIdMap.get(node.id)!,
          courseMapId: newMap.id,
          courseUnitId: node.courseUnitId ? unitIdMap.get(node.courseUnitId) ?? null : null,
          label: node.label,
          nodeType: node.nodeType,
          xPos: node.xPos,
          yPos: node.yPos,
          archived: node.archived,
        },
      })
    }

    // Create edges
    for (const edge of sourceMap.edges) {
      await tx.mapEdge.create({
        data: {
          courseMapId: newMap.id,
          fromNodeId: nodeIdMap.get(edge.fromNodeId)!,
          toNodeId: nodeIdMap.get(edge.toNodeId)!,
          edgeType: edge.edgeType,
        },
      })
    }
  })

  return {
    nodeCount: sourceMap.nodes.length,
    edgeCount: sourceMap.edges.length,
    unitCount: sourceMap.units.length,
  }
}
