/**
 * POST /api/courses/[id]/course-map/edges
 *
 * Creates a new MapEdge between two nodes on the course map.
 * Validates: no self-loops, no duplicate edges, both nodes belong to the same map.
 *
 * Auth: requireCourseOwner (educator who owns the course, or admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import type { MapEdgeType } from '../../../../../generated/prisma'
import { notifyCourseMapChange } from '../../../../../lib/syllabus-architect/notification-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

const VALID_EDGE_TYPES = new Set<string>(['PREREQUISITE', 'SEQUENCE', 'CONCURRENT'])

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    fromNodeId?: string
    toNodeId?: string
    edgeType?: string
  }

  if (!body.fromNodeId || !body.toNodeId || !body.edgeType) {
    return NextResponse.json(
      { error: 'Missing required fields: fromNodeId, toNodeId, edgeType' },
      { status: 400 },
    )
  }

  if (!VALID_EDGE_TYPES.has(body.edgeType)) {
    return NextResponse.json(
      { error: `Invalid edgeType. Must be one of: ${[...VALID_EDGE_TYPES].join(', ')}` },
      { status: 400 },
    )
  }

  // No self-loops
  if (body.fromNodeId === body.toNodeId) {
    return NextResponse.json(
      { error: 'Cannot create an edge from a node to itself' },
      { status: 400 },
    )
  }

  // Verify both nodes exist and belong to this course's map
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  const [fromNode, toNode] = await Promise.all([
    prisma.mapNode.findUnique({
      where: { id: body.fromNodeId },
      select: { id: true, courseMapId: true },
    }),
    prisma.mapNode.findUnique({
      where: { id: body.toNodeId },
      select: { id: true, courseMapId: true },
    }),
  ])

  if (!fromNode || fromNode.courseMapId !== courseMap.id) {
    return NextResponse.json({ error: 'Source node not found in this course map' }, { status: 404 })
  }
  if (!toNode || toNode.courseMapId !== courseMap.id) {
    return NextResponse.json({ error: 'Target node not found in this course map' }, { status: 404 })
  }

  // No duplicate edges (same direction)
  const existing = await prisma.mapEdge.findFirst({
    where: {
      courseMapId: courseMap.id,
      fromNodeId: body.fromNodeId,
      toNodeId: body.toNodeId,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'An edge already exists between these nodes in this direction' },
      { status: 409 },
    )
  }

  const edge = await prisma.mapEdge.create({
    data: {
      courseMapId: courseMap.id,
      fromNodeId: body.fromNodeId,
      toNodeId: body.toNodeId,
      edgeType: body.edgeType as MapEdgeType,
    },
  })

  // Fire-and-forget notification
  notifyCourseMapChange(courseId, user.id, 'edge_added')

  return NextResponse.json(edge, { status: 201 })
})
