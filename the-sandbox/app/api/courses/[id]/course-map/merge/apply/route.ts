import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { prisma } from '../../../../../../lib/prisma'
import type { SnapshotNodeData, SnapshotEdgeData } from '../../../../../../lib/syllabus-architect/snapshot-service'
import { notifyCourseMapChange } from '../../../../../../lib/syllabus-architect/notification-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

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
  const { mergedNodes, mergedEdges, resolutions } = parsed.data as {
    mergedNodes: SnapshotNodeData[]
    mergedEdges: SnapshotEdgeData[]
    resolutions?: { nodeId: string; field: string; chosenValue: string | number }[]
  }

  if (!mergedNodes || !mergedEdges) {
    return NextResponse.json(
      { error: 'mergedNodes and mergedEdges are required' },
      { status: 400 },
    )
  }

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  // Apply conflict resolutions to merged nodes
  const resolvedNodes = [...mergedNodes]
  if (resolutions?.length) {
    for (const res of resolutions) {
      const nodeIdx = resolvedNodes.findIndex((n) => n.id === res.nodeId)
      if (nodeIdx === -1) continue

      if (res.field === 'label') {
        resolvedNodes[nodeIdx] = { ...resolvedNodes[nodeIdx], label: String(res.chosenValue) }
      } else if (res.field === 'position' && typeof res.chosenValue === 'string') {
        const [x, y] = res.chosenValue.split(',').map(Number)
        if (!isNaN(x) && !isNaN(y)) {
          resolvedNodes[nodeIdx] = { ...resolvedNodes[nodeIdx], xPos: x, yPos: y }
        }
      }
    }
  }

  // Replace current graph in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.mapEdge.deleteMany({ where: { courseMapId: courseMap.id } })
    await tx.mapNode.deleteMany({ where: { courseMapId: courseMap.id } })

    for (const node of resolvedNodes) {
      await tx.mapNode.create({
        data: {
          id: node.id,
          courseMapId: courseMap.id,
          courseUnitId: node.courseUnitId,
          label: node.label,
          nodeType: node.nodeType as 'UNIT' | 'MODULE',
          xPos: node.xPos,
          yPos: node.yPos,
          archived: node.archived,
        },
      })
    }

    for (const edge of mergedEdges) {
      await tx.mapEdge.create({
        data: {
          id: edge.id,
          courseMapId: courseMap.id,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          edgeType: edge.edgeType as 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT',
        },
      })
    }
  })

  // Fire-and-forget notification
  notifyCourseMapChange(
    courseId,
    user.id,
    'merge_applied',
    `${resolvedNodes.length} nodes, ${mergedEdges.length} edges`,
  )

  return NextResponse.json({
    appliedNodes: resolvedNodes.length,
    appliedEdges: mergedEdges.length,
  })
})
