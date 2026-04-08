/**
 * PATCH /api/courses/[id]/course-map/nodes/[nodeId]
 *
 * Updates a MapNode (label, xPos, yPos) and its associated CourseUnit
 * (label, startDate, endDate, unitType) in a transaction.
 *
 * If dates are manually edited, sets dateConfidence to 1.0 (educator-verified).
 *
 * Auth: requireCourseOwner (educator who owns the course, or admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { prisma } from '../../../../../../lib/prisma'
import type { CourseMapUnitType } from '../../../../../../generated/prisma'
import { notifyCourseMapChange } from '../../../../../../lib/syllabus-architect/notification-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

const VALID_UNIT_TYPES = new Set<string>([
  'LECTURE', 'LAB', 'EXAM', 'QUIZ', 'ASSIGNMENT', 'DISCUSSION', 'OTHER',
])

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> },
) => {
  const { id: courseId, nodeId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    label?: string
    startDate?: string | null
    endDate?: string | null
    unitType?: string
    xPos?: number
    yPos?: number
  }

  // Verify node exists and belongs to this course's map
  const node = await prisma.mapNode.findUnique({
    where: { id: nodeId },
    include: { courseMap: { select: { courseId: true } } },
  })
  if (!node || node.courseMap.courseId !== courseId) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  // Validate unitType if provided
  if (body.unitType && !VALID_UNIT_TYPES.has(body.unitType)) {
    return NextResponse.json(
      { error: `Invalid unitType. Must be one of: ${[...VALID_UNIT_TYPES].join(', ')}` },
      { status: 400 },
    )
  }

  // Determine if dates are being manually edited
  const datesEdited = body.startDate !== undefined || body.endDate !== undefined

  // Build update payloads
  const nodeUpdate: Record<string, unknown> = {}
  if (body.label !== undefined) nodeUpdate.label = body.label
  if (body.xPos !== undefined) nodeUpdate.xPos = body.xPos
  if (body.yPos !== undefined) nodeUpdate.yPos = body.yPos

  const unitUpdate: Record<string, unknown> = {}
  if (body.label !== undefined) unitUpdate.label = body.label
  if (body.startDate !== undefined) {
    unitUpdate.startDate = body.startDate ? new Date(body.startDate) : null
  }
  if (body.endDate !== undefined) {
    unitUpdate.endDate = body.endDate ? new Date(body.endDate) : null
  }
  if (body.unitType !== undefined) {
    unitUpdate.unitType = body.unitType as CourseMapUnitType
  }
  if (datesEdited) {
    unitUpdate.dateConfidence = 1.0
  }

  // Transaction: update node + associated unit
  const result = await prisma.$transaction(async (tx) => {
    const updatedNode = await tx.mapNode.update({
      where: { id: nodeId },
      data: nodeUpdate,
    })

    let updatedUnit = null
    if (node.courseUnitId && Object.keys(unitUpdate).length > 0) {
      updatedUnit = await tx.courseUnit.update({
        where: { id: node.courseUnitId },
        data: unitUpdate,
        include: {
          modules: { include: { lessons: true } },
        },
      })
    }

    return { node: updatedNode, unit: updatedUnit }
  })

  // Fire-and-forget notification
  notifyCourseMapChange(courseId, user.id, 'node_modified', body.label ? `Updated "${body.label}"` : undefined)

  return NextResponse.json(result)
})
