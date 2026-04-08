import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { mergeGraphs } from '../../../../../lib/syllabus-architect/diff-service'
import type { SnapshotData } from '../../../../../lib/syllabus-architect/snapshot-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { baseSnapshotId, sourceSnapshotId } = parsed.data as {
    baseSnapshotId: string
    sourceSnapshotId: string
  }

  if (!baseSnapshotId || !sourceSnapshotId) {
    return NextResponse.json(
      { error: 'baseSnapshotId and sourceSnapshotId are required' },
      { status: 400 },
    )
  }

  // Load base + source snapshots
  const [baseSnap, sourceSnap] = await Promise.all([
    prisma.courseMapSnapshot.findFirst({ where: { id: baseSnapshotId, courseId } }),
    prisma.courseMapSnapshot.findFirst({ where: { id: sourceSnapshotId, courseId } }),
  ])
  if (!baseSnap?.graphJson) {
    return NextResponse.json({ error: 'Base snapshot not found or has no graph data' }, { status: 404 })
  }
  if (!sourceSnap?.graphJson) {
    return NextResponse.json({ error: 'Source snapshot not found or has no graph data' }, { status: 404 })
  }

  // Load current graph as target
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: { nodes: true, edges: true },
  })
  if (!courseMap) {
    return NextResponse.json({ error: 'Course map not found' }, { status: 404 })
  }

  const target: SnapshotData = {
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
  }

  const base = baseSnap.graphJson as unknown as SnapshotData
  const source = sourceSnap.graphJson as unknown as SnapshotData

  const result = mergeGraphs(base, source, target)
  return NextResponse.json(result)
})
