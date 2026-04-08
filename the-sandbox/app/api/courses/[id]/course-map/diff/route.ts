import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { diffGraphs } from '../../../../../lib/syllabus-architect/diff-service'
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
  const { snapshotIdA, snapshotIdB } = parsed.data as {
    snapshotIdA?: string
    snapshotIdB?: string
  }

  if (!snapshotIdA && !snapshotIdB) {
    return NextResponse.json(
      { error: 'At least one snapshot ID is required' },
      { status: 400 },
    )
  }

  // Helper to load current graph state as SnapshotData
  async function getCurrentGraph(): Promise<SnapshotData> {
    const courseMap = await prisma.courseMap.findUnique({
      where: { courseId },
      include: { nodes: true, edges: true },
    })
    if (!courseMap) throw new Error('Course map not found')
    return {
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
  }

  // Helper to load a snapshot's graph data
  async function getSnapshotGraph(snapshotId: string): Promise<SnapshotData> {
    const snapshot = await prisma.courseMapSnapshot.findFirst({
      where: { id: snapshotId, courseId },
    })
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`)
    if (!snapshot.graphJson) throw new Error('Snapshot has no graph data')
    return snapshot.graphJson as unknown as SnapshotData
  }

  const [graphA, graphB] = await Promise.all([
    snapshotIdA ? getSnapshotGraph(snapshotIdA) : getCurrentGraph(),
    snapshotIdB ? getSnapshotGraph(snapshotIdB) : getCurrentGraph(),
  ])

  const diff = diffGraphs(graphA, graphB)
  return NextResponse.json(diff)
})
