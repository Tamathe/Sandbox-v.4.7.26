/**
 * Course Map snapshot service — save and restore named versions of the graph.
 *
 * Snapshots serialize all nodes + edges + positions into a JSON blob stored
 * in CourseMapSnapshot.graphJson. Restoring replaces current nodes/edges
 * inside a single transaction.
 */

import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SnapshotNodeData {
  id: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

export interface SnapshotEdgeData {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export interface SnapshotData {
  nodes: SnapshotNodeData[]
  edges: SnapshotEdgeData[]
}

export interface SnapshotSummary {
  id: string
  name: string | null
  createdById: string | null
  createdAt: string
  nodeCount: number
  edgeCount: number
}

const MAX_SNAPSHOTS = 30

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a snapshot of the current graph-based course map.
 */
export async function createGraphSnapshot(
  courseId: string,
  name: string,
  createdById: string,
): Promise<SnapshotSummary> {
  // Load the CourseMap with all nodes and edges
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: true,
      edges: true,
    },
  })
  if (!courseMap) throw new Error('Course map not found')

  const graphData: SnapshotData = {
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

  // Enforce max snapshots — delete oldest if at limit
  const existing = await prisma.courseMapSnapshot.count({ where: { courseId } })
  if (existing >= MAX_SNAPSHOTS) {
    const oldest = await prisma.courseMapSnapshot.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (oldest) {
      await prisma.courseMapSnapshot.delete({ where: { id: oldest.id } })
    }
  }

  const snapshot = await prisma.courseMapSnapshot.create({
    data: {
      courseId,
      label: name,
      createdById,
      weeksJson: [], // empty — this is a graph snapshot, not week-based
      graphJson: graphData as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    id: snapshot.id,
    name: snapshot.label,
    createdById: snapshot.createdById,
    createdAt: snapshot.createdAt.toISOString(),
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
  }
}

/**
 * Restore a graph snapshot — replaces current nodes/edges in a transaction.
 */
export async function restoreGraphSnapshot(
  courseId: string,
  snapshotId: string,
): Promise<{ restoredNodes: number; restoredEdges: number }> {
  const snapshot = await prisma.courseMapSnapshot.findFirst({
    where: { id: snapshotId, courseId },
  })
  if (!snapshot) throw new Error('Snapshot not found')
  if (!snapshot.graphJson) throw new Error('Snapshot has no graph data')

  const data = snapshot.graphJson as unknown as SnapshotData
  if (!data.nodes || !data.edges) throw new Error('Invalid snapshot data')

  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    select: { id: true },
  })
  if (!courseMap) throw new Error('Course map not found')

  // Transaction: delete all existing nodes/edges, recreate from snapshot
  await prisma.$transaction(async (tx) => {
    // Edges must be deleted first (FK constraint)
    await tx.mapEdge.deleteMany({ where: { courseMapId: courseMap.id } })
    await tx.mapNode.deleteMany({ where: { courseMapId: courseMap.id } })

    // Re-create nodes
    for (const node of data.nodes) {
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

    // Re-create edges
    for (const edge of data.edges) {
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

  return {
    restoredNodes: data.nodes.length,
    restoredEdges: data.edges.length,
  }
}

/**
 * List graph snapshots for a course.
 */
export async function listGraphSnapshots(courseId: string): Promise<SnapshotSummary[]> {
  const snapshots = await prisma.courseMapSnapshot.findMany({
    where: { courseId, NOT: { graphJson: { equals: Prisma.DbNull } } },
    orderBy: { createdAt: 'desc' },
    take: MAX_SNAPSHOTS,
    select: {
      id: true,
      label: true,
      createdById: true,
      createdAt: true,
      graphJson: true,
    },
  })

  return snapshots.map((s) => {
    const data = s.graphJson as unknown as SnapshotData | null
    return {
      id: s.id,
      name: s.label,
      createdById: s.createdById,
      createdAt: s.createdAt.toISOString(),
      nodeCount: data?.nodes?.length ?? 0,
      edgeCount: data?.edges?.length ?? 0,
    }
  })
}

// ── Snapshot Comparison ──────────────────────────────────────────────────────

export interface SnapshotComparisonResult {
  added: { nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] }
  removed: { nodes: SnapshotNodeData[]; edges: SnapshotEdgeData[] }
  modified: {
    nodes: Array<{
      id: string
      field: string
      oldValue: string | number | boolean
      newValue: string | number | boolean
      node: SnapshotNodeData
    }>
    edges: Array<{
      id: string
      field: string
      oldValue: string
      newValue: string
      edge: SnapshotEdgeData
    }>
  }
  summary: string
}

/**
 * Compare two snapshots and return the differences.
 */
export async function compareSnapshots(
  snapshotIdA: string,
  snapshotIdB: string,
): Promise<SnapshotComparisonResult> {
  const [snapA, snapB] = await Promise.all([
    prisma.courseMapSnapshot.findUnique({ where: { id: snapshotIdA }, select: { graphJson: true, label: true } }),
    prisma.courseMapSnapshot.findUnique({ where: { id: snapshotIdB }, select: { graphJson: true, label: true } }),
  ])

  if (!snapA) throw new Error('Snapshot A not found')
  if (!snapB) throw new Error('Snapshot B not found')

  const dataA = (snapA.graphJson as unknown as SnapshotData) ?? { nodes: [], edges: [] }
  const dataB = (snapB.graphJson as unknown as SnapshotData) ?? { nodes: [], edges: [] }

  const nodesA = new Map(dataA.nodes.map((n) => [n.id, n]))
  const nodesB = new Map(dataB.nodes.map((n) => [n.id, n]))
  const edgesA = new Map(dataA.edges.map((e) => [e.id, e]))
  const edgesB = new Map(dataB.edges.map((e) => [e.id, e]))

  // Nodes added in B (not in A)
  const addedNodes = dataB.nodes.filter((n) => !nodesA.has(n.id))
  // Nodes removed in B (in A but not B)
  const removedNodes = dataA.nodes.filter((n) => !nodesB.has(n.id))
  // Modified nodes (in both, but different)
  const modifiedNodes: SnapshotComparisonResult['modified']['nodes'] = []
  for (const [id, nodeA] of nodesA) {
    const nodeB = nodesB.get(id)
    if (!nodeB) continue
    if (nodeA.label !== nodeB.label) {
      modifiedNodes.push({ id, field: 'label', oldValue: nodeA.label, newValue: nodeB.label, node: nodeB })
    }
    if (nodeA.nodeType !== nodeB.nodeType) {
      modifiedNodes.push({ id, field: 'nodeType', oldValue: nodeA.nodeType, newValue: nodeB.nodeType, node: nodeB })
    }
    if (nodeA.archived !== nodeB.archived) {
      modifiedNodes.push({ id, field: 'archived', oldValue: nodeA.archived, newValue: nodeB.archived, node: nodeB })
    }
  }

  // Edges added in B
  const addedEdges = dataB.edges.filter((e) => !edgesA.has(e.id))
  // Edges removed in B
  const removedEdges = dataA.edges.filter((e) => !edgesB.has(e.id))
  // Modified edges
  const modifiedEdges: SnapshotComparisonResult['modified']['edges'] = []
  for (const [id, edgeA] of edgesA) {
    const edgeB = edgesB.get(id)
    if (!edgeB) continue
    if (edgeA.edgeType !== edgeB.edgeType) {
      modifiedEdges.push({ id, field: 'edgeType', oldValue: edgeA.edgeType, newValue: edgeB.edgeType, edge: edgeB })
    }
  }

  const parts: string[] = []
  if (addedNodes.length) parts.push(`${addedNodes.length} node(s) added`)
  if (removedNodes.length) parts.push(`${removedNodes.length} node(s) removed`)
  if (modifiedNodes.length) parts.push(`${modifiedNodes.length} node change(s)`)
  if (addedEdges.length) parts.push(`${addedEdges.length} edge(s) added`)
  if (removedEdges.length) parts.push(`${removedEdges.length} edge(s) removed`)
  if (modifiedEdges.length) parts.push(`${modifiedEdges.length} edge change(s)`)
  const summary = parts.length ? parts.join(', ') : 'No differences found'

  return {
    added: { nodes: addedNodes, edges: addedEdges },
    removed: { nodes: removedNodes, edges: removedEdges },
    modified: { nodes: modifiedNodes, edges: modifiedEdges },
    summary,
  }
}

/**
 * Delete a snapshot.
 */
export async function deleteGraphSnapshot(
  courseId: string,
  snapshotId: string,
): Promise<void> {
  const snapshot = await prisma.courseMapSnapshot.findFirst({
    where: { id: snapshotId, courseId },
    select: { id: true },
  })
  if (!snapshot) throw new Error('Snapshot not found')
  await prisma.courseMapSnapshot.delete({ where: { id: snapshotId } })
}
