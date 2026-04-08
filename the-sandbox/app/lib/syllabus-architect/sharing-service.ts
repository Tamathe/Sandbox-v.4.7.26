/**
 * Graph-based course map sharing service.
 *
 * Generates share tokens stored on the CourseMap model (distinct from the
 * week-based Course.shareToken). Supports optional access codes and
 * returns read-only graph data for public viewers.
 */

import { randomBytes } from 'crypto'
import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SharedGraphMap {
  courseCode: string
  courseTitle: string
  courseMapId: string
  nodes: Array<{
    id: string
    label: string
    nodeType: string
    xPos: number
    yPos: number
    courseUnitId: string | null
  }>
  edges: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
    edgeType: string
  }>
  units: Array<{
    id: string
    label: string
    description: string | null
    unitType: string
    startDate: string | null
    endDate: string | null
    position: number
    modules: Array<{
      id: string
      label: string
      description: string | null
      lessons: Array<{
        id: string
        label: string
        dueDate: string | null
      }>
    }>
  }>
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a share token for a course map's graph view.
 * Returns existing token if one already exists.
 */
export async function generateGraphShareLink(courseId: string): Promise<{
  shareToken: string
  shareAccessCode: string | null
}> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true, shareToken: true, shareAccessCode: true },
  })
  if (!courseMap) throw new Error('Course map not found')

  if (courseMap.shareToken) {
    return {
      shareToken: courseMap.shareToken,
      shareAccessCode: courseMap.shareAccessCode,
    }
  }

  const token = randomBytes(16).toString('hex')
  await prisma.courseMap.update({
    where: { courseId },
    data: { shareToken: token },
  })

  return { shareToken: token, shareAccessCode: null }
}

/**
 * Revoke the share token — disables public access.
 */
export async function revokeGraphShareLink(courseId: string): Promise<void> {
  await prisma.courseMap.update({
    where: { courseId },
    data: { shareToken: null, shareAccessCode: null },
  })
}

/**
 * Set or clear an access code for the shared link.
 */
export async function setGraphShareAccessCode(
  courseId: string,
  code: string | null,
): Promise<void> {
  await prisma.courseMap.update({
    where: { courseId },
    data: { shareAccessCode: code || null },
  })
}

/**
 * Get the current share status for a course map.
 */
export async function getGraphShareStatus(courseId: string): Promise<{
  shareToken: string | null
  shareAccessCode: string | null
}> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { shareToken: true, shareAccessCode: true },
  })
  return {
    shareToken: courseMap?.shareToken ?? null,
    shareAccessCode: courseMap?.shareAccessCode ?? null,
  }
}

/**
 * Get shared graph map data by token. Returns null if token invalid.
 * If access code is set on the map, caller must provide matching code.
 */
export async function getSharedGraphMap(
  token: string,
  accessCode?: string,
): Promise<SharedGraphMap | null> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { shareToken: token },
    include: {
      course: { select: { courseCode: true, title: true } },
      nodes: {
        where: { archived: false },
        select: {
          id: true,
          label: true,
          nodeType: true,
          xPos: true,
          yPos: true,
          courseUnitId: true,
        },
      },
      edges: {
        select: {
          id: true,
          fromNodeId: true,
          toNodeId: true,
          edgeType: true,
        },
      },
      units: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          description: true,
          unitType: true,
          startDate: true,
          endDate: true,
          position: true,
          modules: {
            select: {
              id: true,
              label: true,
              description: true,
              lessons: {
                select: {
                  id: true,
                  label: true,
                  dueDate: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!courseMap) return null

  // Check access code if one is set
  if (courseMap.shareAccessCode && courseMap.shareAccessCode !== accessCode) {
    return null
  }

  return {
    courseCode: courseMap.course.courseCode,
    courseTitle: courseMap.course.title,
    courseMapId: courseMap.id,
    nodes: courseMap.nodes,
    edges: courseMap.edges,
    units: courseMap.units.map((u) => ({
      id: u.id,
      label: u.label,
      description: u.description,
      unitType: u.unitType,
      startDate: u.startDate?.toISOString() ?? null,
      endDate: u.endDate?.toISOString() ?? null,
      position: u.position,
      modules: u.modules.map((m) => ({
        id: m.id,
        label: m.label,
        description: m.description,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          label: l.label,
          dueDate: l.dueDate?.toISOString() ?? null,
        })),
      })),
    })),
  }
}

/**
 * Check if a share token requires an access code (without revealing the map).
 */
export async function checkShareRequiresCode(token: string): Promise<{
  found: boolean
  requiresCode: boolean
}> {
  const courseMap = await prisma.courseMap.findUnique({
    where: { shareToken: token },
    select: { shareAccessCode: true },
  })
  if (!courseMap) return { found: false, requiresCode: false }
  return { found: true, requiresCode: !!courseMap.shareAccessCode }
}
