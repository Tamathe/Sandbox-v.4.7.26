/**
 * LMS Deep Link Service
 *
 * Generates Canvas LMS deep links from course map nodes to
 * Canvas assignments and modules. Gracefully degrades when
 * CANVAS_BASE_URL is not configured.
 */

import { prisma } from '../prisma'
import { canvasConfigured } from '../canvas-client'
import { getInstitutionIntegrationByKey } from '../integrations/registry'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LmsNodeLink {
  nodeId: string
  nodeLabel: string
  lmsUrl: string
  linkType: 'assignment' | 'module'
  title: string
}

export interface LmsLinksResult {
  configured: boolean
  canvasBaseUrl: string | null
  canvasCourseId: string | null
  links: LmsNodeLink[]
}

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Generate deep links for all course map nodes that can be mapped to
 * Canvas assignments or modules.
 *
 * Linking strategy:
 * - Each node is tied to a CourseUnit. Each unit has modules and lessons.
 * - Assignments are matched by title similarity to unit labels.
 * - When assignments have a canvasAssignmentId, we generate a direct link.
 * - Otherwise we link to the Canvas course modules page.
 */
export async function generateDeepLinks(courseId: string): Promise<LmsLinksResult> {
  const canvasIntegration = await getInstitutionIntegrationByKey('CANVAS')
  const baseUrl = canvasIntegration.effectiveBaseUrl
  const configured = await canvasConfigured()

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { canvasCourseId: true },
  })

  if (!configured || !course?.canvasCourseId || !baseUrl) {
    return {
      configured,
      canvasBaseUrl: baseUrl || null,
      canvasCourseId: course?.canvasCourseId || null,
      links: [],
    }
  }

  const canvasCourseId = course.canvasCourseId

  // Fetch course map nodes with their units
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: {
        where: { archived: false },
        include: {
          courseUnit: {
            select: { label: true },
          },
        },
      },
    },
  })

  if (!courseMap) {
    return { configured, canvasBaseUrl: baseUrl, canvasCourseId, links: [] }
  }

  // Fetch assignments with canvas IDs
  const assignments = await prisma.assignment.findMany({
    where: { courseId },
    select: {
      id: true,
      title: true,
      canvasAssignmentId: true,
    },
  })

  // Build a map from lowercase assignment title → assignment for fuzzy matching
  const assignmentByTitle = new Map(
    assignments.map((a) => [a.title.toLowerCase().trim(), a]),
  )

  const links: LmsNodeLink[] = []

  for (const node of courseMap.nodes) {
    const unitLabel = node.courseUnit?.label || node.label
    const normalizedLabel = unitLabel.toLowerCase().trim()

    // Try to match node to an assignment by title
    const matchedAssignment = assignmentByTitle.get(normalizedLabel)

    if (matchedAssignment?.canvasAssignmentId) {
      // Direct deep link to the Canvas assignment
      links.push({
        nodeId: node.id,
        nodeLabel: node.label,
        lmsUrl: `${baseUrl}/courses/${canvasCourseId}/assignments/${matchedAssignment.canvasAssignmentId}`,
        linkType: 'assignment',
        title: matchedAssignment.title,
      })
    } else {
      // Fallback: link to the modules page (Canvas will show the matching module)
      links.push({
        nodeId: node.id,
        nodeLabel: node.label,
        lmsUrl: `${baseUrl}/courses/${canvasCourseId}/modules`,
        linkType: 'module',
        title: unitLabel,
      })
    }
  }

  return { configured, canvasBaseUrl: baseUrl, canvasCourseId, links }
}

/**
 * Get the LMS URL for a specific node.
 * Returns null if Canvas is not configured or no link can be generated.
 */
export async function getLmsLinkForNode(
  courseId: string,
  nodeId: string,
): Promise<LmsNodeLink | null> {
  const result = await generateDeepLinks(courseId)
  return result.links.find((l) => l.nodeId === nodeId) || null
}
