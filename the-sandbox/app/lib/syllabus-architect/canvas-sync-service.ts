/**
 * Canvas LMS sync service for course maps.
 *
 * Provides import/export between the University of Kentucky course maps and Canvas LMS
 * course structure (modules + module items).
 */

import { prisma } from '../prisma'
import {
  getCanvasModules,
  getCanvasModuleItems,
  createCanvasModule,
  addCanvasModuleItem,
  canvasConfigured,
} from '../canvas-client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanvasSyncStatus {
  configured: boolean
  lastSyncAt: string | null
  lastSyncDirection: 'import' | 'export' | null
  unitCount: number
  nodeCount: number
  error: string | null
}

export interface CanvasImportResult {
  unitsCreated: number
  nodesCreated: number
  modulesCreated: number
  lessonsCreated: number
}

export interface CanvasExportResult {
  modulesCreated: number
  itemsCreated: number
}

// ── Import from Canvas ───────────────────────────────────────────────────────

/**
 * Import Canvas modules/items into a course map as CourseUnits, MapNodes,
 * CourseModules, and CourseLessonItems.
 */
export async function importFromCanvas(
  courseId: string,
  canvasCourseId: string,
): Promise<CanvasImportResult> {
  if (!(await canvasConfigured())) {
    throw new Error('Canvas is not configured — set CANVAS_BASE_URL and CANVAS_API_TOKEN')
  }

  // Ensure course map exists
  let courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    courseMap = await prisma.courseMap.create({
      data: { courseId },
      select: { id: true },
    })
  }

  const modules = await getCanvasModules(canvasCourseId)

  // Fetch all module items upfront (parallel) instead of inside the loop
  const modulesWithItems = await Promise.all(
    modules.map(async (canvasModule) => ({
      canvasModule,
      items: await getCanvasModuleItems(canvasCourseId, canvasModule.id),
    })),
  )

  // Batch all DB writes in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    let unitsCreated = 0
    let nodesCreated = 0
    let modulesCreated = 0
    let lessonsCreated = 0

    for (const { canvasModule, items } of modulesWithItems) {
      // Create a CourseUnit per Canvas module
      const unit = await tx.courseUnit.create({
        data: {
          courseMapId: courseMap.id,
          label: canvasModule.name,
          unitType: 'LECTURE',
          position: canvasModule.position,
        },
      })
      unitsCreated++

      // Create a MapNode for the unit
      await tx.mapNode.create({
        data: {
          courseMapId: courseMap.id,
          courseUnitId: unit.id,
          label: canvasModule.name,
          nodeType: 'UNIT',
          xPos: 100,
          yPos: 100 + canvasModule.position * 120,
        },
      })
      nodesCreated++

      // Create a CourseModule to hold lesson items
      const courseModule = await tx.courseModule.create({
        data: {
          courseUnitId: unit.id,
          label: canvasModule.name,
        },
      })
      modulesCreated++

      // Bulk-create all lesson items for this module
      if (items.length > 0) {
        await tx.courseLessonItem.createMany({
          data: items.map((item) => ({
            courseModuleId: courseModule.id,
            label: `${item.type}: ${item.title}`,
          })),
        })
        lessonsCreated += items.length
      }
    }

    return { unitsCreated, nodesCreated, modulesCreated, lessonsCreated }
  })

  return result
}

// ── Export to Canvas ─────────────────────────────────────────────────────────

/**
 * Export course map units/modules/lessons to Canvas as modules and module items.
 */
export async function exportToCanvas(
  courseId: string,
  canvasCourseId: string,
): Promise<CanvasExportResult> {
  if (!(await canvasConfigured())) {
    throw new Error('Canvas is not configured — set CANVAS_BASE_URL and CANVAS_API_TOKEN')
  }

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      units: {
        orderBy: { position: 'asc' },
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      },
    },
  })

  if (!courseMap) throw new Error('Course map not found')
  if (courseMap.units.length === 0) throw new Error('No units to export')

  let modulesCreated = 0
  let itemsCreated = 0

  for (const unit of courseMap.units) {
    const canvasModule = await createCanvasModule(
      canvasCourseId,
      unit.label,
      unit.position,
    )
    modulesCreated++

    for (const mod of unit.modules) {
      // Add module label as a sub-header
      await addCanvasModuleItem(canvasCourseId, canvasModule.id, mod.label, 'SubHeader')
      itemsCreated++

      // Add each lesson item
      for (const lesson of mod.lessons) {
        await addCanvasModuleItem(canvasCourseId, canvasModule.id, lesson.label, 'SubHeader')
        itemsCreated++
      }
    }
  }

  return { modulesCreated, itemsCreated }
}

// ── Generate Canvas Module Structure ─────────────────────────────────────────

export interface CanvasModuleProposal {
  name: string
  position: number
  items: Array<{ title: string; type: string; indent: number }>
}

/**
 * Generate a Canvas-compatible module structure from the course map.
 * Maps CourseUnits → modules, their modules/lessons → module items.
 */
export async function generateCanvasModuleStructure(
  courseId: string,
): Promise<CanvasModuleProposal[]> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      units: {
        orderBy: { position: 'asc' },
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      },
    },
  })

  if (!courseMap) throw new Error('Course map not found')
  if (courseMap.units.length === 0) return []

  return courseMap.units.map((unit, idx) => {
    const items: Array<{ title: string; type: string; indent: number }> = []

    for (const mod of unit.modules) {
      // Module label as a sub-header
      items.push({ title: mod.label, type: 'SubHeader', indent: 0 })

      for (const lesson of mod.lessons) {
        items.push({
          title: lesson.label,
          type: 'Page',
          indent: 1,
        })
      }
    }

    return {
      name: unit.label,
      position: idx + 1,
      items,
    }
  })
}

/**
 * Push the proposed module structure to Canvas LMS.
 */
export async function pushModulesToCanvas(
  canvasCourseId: string,
  modules: CanvasModuleProposal[],
): Promise<{ modulesCreated: number; itemsCreated: number }> {
  if (!(await canvasConfigured())) {
    throw new Error('Canvas is not configured — set CANVAS_BASE_URL and CANVAS_API_TOKEN')
  }

  let modulesCreated = 0
  let itemsCreated = 0

  for (const mod of modules) {
    const canvasModule = await createCanvasModule(canvasCourseId, mod.name, mod.position)
    modulesCreated++

    for (const item of mod.items) {
      await addCanvasModuleItem(canvasCourseId, canvasModule.id, item.title, item.type as 'SubHeader' | 'ExternalUrl' | 'Page')
      itemsCreated++
    }
  }

  return { modulesCreated, itemsCreated }
}

// ── Sync status ──────────────────────────────────────────────────────────────

/**
 * Returns the current Canvas sync status for a course map.
 */
export async function syncStatus(courseId: string): Promise<CanvasSyncStatus> {
  const configured = await canvasConfigured()

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      units: { select: { id: true } },
      nodes: { where: { archived: false }, select: { id: true } },
    },
  })

  return {
    configured,
    lastSyncAt: courseMap?.updatedAt?.toISOString() ?? null,
    lastSyncDirection: null, // Could be stored in a metadata field in the future
    unitCount: courseMap?.units.length ?? 0,
    nodeCount: courseMap?.nodes.length ?? 0,
    error: configured ? null : 'Canvas not configured',
  }
}
