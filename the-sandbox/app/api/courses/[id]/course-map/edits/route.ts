import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { getCourseMapEdits, getCourseMapVersion } from '../../../../../lib/course-map-service'
import { prisma } from '../../../../../lib/prisma'
import type { MapEdgeType } from '../../../../../generated/prisma'
import { broadcastEvent } from '../../../../../lib/syllabus-architect/collab-editing'
import type { CollabEditEvent } from '../../../../../lib/syllabus-architect/collab-editing'
import { notifyMapEditors, notifyEnrolledStudents } from '../../../../../lib/syllabus-architect/notification-service'
import type { MapNotificationEvent } from '../../../../../lib/syllabus-architect/notification-service'
import { dispatchWebhook } from '../../../../../lib/syllabus-architect/webhook-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const [edits, version] = await Promise.all([
    getCourseMapEdits(courseId),
    getCourseMapVersion(courseId),
  ])

  return NextResponse.json({ edits, version })
})

/**
 * POST /api/courses/[id]/course-map/edits
 *
 * Accept an edit event, persist to DB, broadcast via collab bus.
 * Body: { editType: 'node_moved' | 'node_updated' | 'edge_created' | 'edge_deleted' | 'cursor_moved' | 'editing_node', payload: {...} }
 * cursor_moved and editing_node are ephemeral — broadcast only, no DB persistence.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { editType, payload } = parsed.data as {
    editType?: string
    payload?: {
      nodeId?: string
      xPos?: number
      yPos?: number
      label?: string
      unitType?: string
      fromNodeId?: string
      toNodeId?: string
      edgeType?: MapEdgeType
      edgeId?: string
      x?: number
      y?: number
      dueDate?: string
    }
  }

  if (!editType || !payload) {
    return NextResponse.json({ error: 'editType and payload are required' }, { status: 400 })
  }

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  // Persist the edit event and apply the change
  let broadcastPayload: CollabEditEvent | null = null

  switch (editType) {
    case 'node_moved': {
      const { nodeId, xPos, yPos } = payload
      if (!nodeId || xPos == null || yPos == null) {
        return NextResponse.json({ error: 'nodeId, xPos, yPos required' }, { status: 400 })
      }
      await prisma.mapNode.update({
        where: { id: nodeId },
        data: { xPos, yPos },
      })
      await prisma.courseMapEdit.create({
        data: {
          courseId,
          userId: user.id,
          editType: 'MODIFY_WEEK',
          weekNumber: 0,
          payload: { action: 'node_moved', nodeId, xPos, yPos },
        },
      })
      broadcastPayload = {
        type: 'node_moved',
        payload: { nodeId, xPos, yPos, userId: user.id, userName: user.name },
      }
      break
    }

    case 'node_updated': {
      const { nodeId, label, unitType } = payload
      if (!nodeId) {
        return NextResponse.json({ error: 'nodeId required' }, { status: 400 })
      }
      const updateData: Record<string, unknown> = {}
      if (label != null) updateData.label = label
      if (Object.keys(updateData).length > 0) {
        await prisma.mapNode.update({ where: { id: nodeId }, data: updateData })
      }
      await prisma.courseMapEdit.create({
        data: {
          courseId,
          userId: user.id,
          editType: 'MODIFY_WEEK',
          weekNumber: 0,
          payload: { action: 'node_updated', nodeId, label, unitType },
        },
      })
      broadcastPayload = {
        type: 'node_updated',
        payload: { nodeId, label, unitType, userId: user.id, userName: user.name },
      }
      break
    }

    case 'edge_created': {
      const { fromNodeId, toNodeId, edgeType } = payload
      if (!fromNodeId || !toNodeId || !edgeType) {
        return NextResponse.json({ error: 'fromNodeId, toNodeId, edgeType required' }, { status: 400 })
      }
      // Reject duplicate edges
      const existing = await prisma.mapEdge.findFirst({
        where: { courseMapId: courseMap.id, fromNodeId, toNodeId },
      })
      if (existing) {
        return NextResponse.json({ error: 'Edge already exists' }, { status: 409 })
      }
      const edge = await prisma.mapEdge.create({
        data: { courseMapId: courseMap.id, fromNodeId, toNodeId, edgeType },
      })
      await prisma.courseMapEdit.create({
        data: {
          courseId,
          userId: user.id,
          editType: 'MODIFY_WEEK',
          weekNumber: 0,
          payload: { action: 'edge_created', edgeId: edge.id, fromNodeId, toNodeId, edgeType },
        },
      })
      broadcastPayload = {
        type: 'edge_created',
        payload: {
          edgeId: edge.id,
          fromNodeId,
          toNodeId,
          edgeType,
          userId: user.id,
          userName: user.name,
        },
      }
      break
    }

    case 'edge_deleted': {
      const { edgeId } = payload
      if (!edgeId) {
        return NextResponse.json({ error: 'edgeId required' }, { status: 400 })
      }
      await prisma.mapEdge.delete({ where: { id: edgeId } }).catch(() => {
        // Edge may already be deleted
      })
      await prisma.courseMapEdit.create({
        data: {
          courseId,
          userId: user.id,
          editType: 'MODIFY_WEEK',
          weekNumber: 0,
          payload: { action: 'edge_deleted', edgeId },
        },
      })
      broadcastPayload = {
        type: 'edge_deleted',
        payload: { edgeId, userId: user.id, userName: user.name },
      }
      break
    }

    case 'cursor_moved': {
      const { x, y } = payload
      if (x == null || y == null) {
        return NextResponse.json({ error: 'x, y required' }, { status: 400 })
      }
      // Ephemeral — broadcast only, no DB persistence
      broadcastPayload = {
        type: 'cursor_moved',
        payload: { userId: user.id, userName: user.name, x, y },
      }
      break
    }

    case 'editing_node': {
      const { nodeId } = payload
      // Ephemeral — broadcast only, no DB persistence
      broadcastPayload = {
        type: 'editing_node',
        payload: { userId: user.id, userName: user.name, nodeId: nodeId ?? null },
      }
      break
    }

    default:
      return NextResponse.json({ error: `Unknown editType: ${editType}` }, { status: 400 })
  }

  // Broadcast to all connected editors
  if (broadcastPayload) {
    broadcastEvent(courseMap.id, broadcastPayload)
  }

  // Fire-and-forget: notifications for significant events
  let notifEvent: MapNotificationEvent | null = null
  if (editType === 'node_updated' && payload.label) {
    // Check if a due date changed (payload contains dueDate field)
    if (payload.dueDate) {
      notifEvent = { type: 'MAP_DUE_DATE_CHANGED', nodeLabel: payload.label, newDueDate: payload.dueDate }
    }
  } else if (editType === 'edge_created') {
    // New connection = structural change, notify editors
    notifyMapEditors(courseId, user.id, { type: 'MAP_NODE_ADDED', nodeLabel: 'new connection' }).catch(() => {})
  }
  if (notifEvent) {
    notifyMapEditors(courseId, user.id, notifEvent).catch(() => {})
    notifyEnrolledStudents(courseId, notifEvent).catch(() => {})
  }

  // Fire-and-forget: webhooks
  dispatchWebhook(courseId, { type: editType, payload }).catch(() => {})

  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
