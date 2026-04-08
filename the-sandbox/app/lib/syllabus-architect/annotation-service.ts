/**
 * Annotation layer service for collaborative course map overlays.
 *
 * Educators can create named layers with sticky notes, highlights, and
 * drawings that overlay the course map canvas.
 */

import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export type AnnotationType = 'note' | 'highlight' | 'drawing'

export interface CreateLayerInput {
  courseMapId: string
  name: string
  createdById: string
  color?: string
}

export interface AddAnnotationInput {
  layerId: string
  type: AnnotationType
  content: string
  positionX: number
  positionY: number
  targetNodeId?: string
  createdById: string
}

export interface UpdateAnnotationInput {
  content?: string
  positionX?: number
  positionY?: number
}

// ── Layer CRUD ───────────────────────────────────────────────────────────────

const LAYER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

/**
 * Create a named annotation layer for a course map.
 */
export async function createAnnotationLayer(input: CreateLayerInput) {
  // Pick a color based on existing layer count
  const existingCount = await prisma.annotationLayer.count({
    where: { courseMapId: input.courseMapId },
  })
  const color = input.color || LAYER_COLORS[existingCount % LAYER_COLORS.length]

  return prisma.annotationLayer.create({
    data: {
      courseMapId: input.courseMapId,
      name: input.name,
      color,
      createdById: input.createdById,
    },
    include: { _count: { select: { annotations: true } } },
  })
}

/**
 * List all annotation layers for a course map with annotation counts.
 */
export async function getAnnotationLayers(courseMapId: string) {
  return prisma.annotationLayer.findMany({
    where: { courseMapId },
    include: { _count: { select: { annotations: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Rename an annotation layer.
 */
export async function renameAnnotationLayer(layerId: string, name: string) {
  return prisma.annotationLayer.update({
    where: { id: layerId },
    data: { name },
  })
}

/**
 * Delete an annotation layer and all its annotations.
 */
export async function deleteAnnotationLayer(layerId: string) {
  return prisma.annotationLayer.delete({
    where: { id: layerId },
  })
}

// ── Annotation CRUD ──────────────────────────────────────────────────────────

/**
 * Add an annotation to a layer.
 */
export async function addAnnotation(input: AddAnnotationInput) {
  return prisma.annotation.create({
    data: {
      layerId: input.layerId,
      type: input.type,
      content: input.content,
      positionX: input.positionX,
      positionY: input.positionY,
      targetNodeId: input.targetNodeId ?? null,
      createdById: input.createdById,
    },
  })
}

/**
 * Get all annotations for a layer.
 */
export async function getLayerAnnotations(layerId: string) {
  return prisma.annotation.findMany({
    where: { layerId },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Get all annotations for a course map across all layers.
 */
export async function getCourseMapAnnotations(courseMapId: string) {
  return prisma.annotation.findMany({
    where: { layer: { courseMapId } },
    include: {
      layer: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Update an annotation's content or position.
 */
export async function updateAnnotation(annotationId: string, updates: UpdateAnnotationInput) {
  const data: Record<string, unknown> = {}
  if (updates.content !== undefined) data.content = updates.content
  if (updates.positionX !== undefined) data.positionX = updates.positionX
  if (updates.positionY !== undefined) data.positionY = updates.positionY

  return prisma.annotation.update({
    where: { id: annotationId },
    data,
  })
}

/**
 * Delete an annotation.
 */
export async function deleteAnnotation(annotationId: string) {
  return prisma.annotation.delete({
    where: { id: annotationId },
  })
}

/**
 * Toggle per-user layer visibility preference.
 * Stored in the layer's metadata JSON field.
 */
export async function toggleLayerVisibility(
  layerId: string,
  userId: string,
  visible: boolean,
) {
  const layer = await prisma.annotationLayer.findUniqueOrThrow({
    where: { id: layerId },
    select: { metadata: true },
  })

  const meta = (layer.metadata as Record<string, unknown>) ?? {}
  const hiddenBy = (meta.hiddenBy as string[]) ?? []

  let updatedHiddenBy: string[]
  if (visible) {
    updatedHiddenBy = hiddenBy.filter((uid) => uid !== userId)
  } else {
    updatedHiddenBy = hiddenBy.includes(userId) ? hiddenBy : [...hiddenBy, userId]
  }

  return prisma.annotationLayer.update({
    where: { id: layerId },
    data: { metadata: { ...meta, hiddenBy: updatedHiddenBy } },
  })
}

/**
 * Check if a layer is visible for a user.
 */
export function isLayerVisibleForUser(
  layerMetadata: Record<string, unknown> | null,
  userId: string,
): boolean {
  if (!layerMetadata) return true
  const hiddenBy = (layerMetadata.hiddenBy as string[]) ?? []
  return !hiddenBy.includes(userId)
}
