/**
 * Course Map diff & merge service — visual diff between snapshots and
 * three-way merge with conflict resolution.
 */

import type { SnapshotData, SnapshotNodeData, SnapshotEdgeData } from './snapshot-service'

// ── Diff Types ──────────────────────────────────────────────────────────────

export interface DiffResult {
  addedNodes: SnapshotNodeData[]
  removedNodes: SnapshotNodeData[]
  movedNodes: { node: SnapshotNodeData; fromX: number; fromY: number; toX: number; toY: number }[]
  modifiedNodes: { node: SnapshotNodeData; oldLabel: string; newLabel: string }[]
  unchangedNodes: SnapshotNodeData[]
  addedEdges: SnapshotEdgeData[]
  removedEdges: SnapshotEdgeData[]
  unchangedEdges: SnapshotEdgeData[]
}

// ── Merge Types ─────────────────────────────────────────────────────────────

export interface MergeConflict {
  nodeId: string
  field: string
  baseValue: string | number
  sourceValue: string | number
  targetValue: string | number
}

export interface MergeResult {
  mergedNodes: SnapshotNodeData[]
  mergedEdges: SnapshotEdgeData[]
  conflicts: MergeConflict[]
}

// ── Constants ───────────────────────────────────────────────────────────────

const POSITION_THRESHOLD = 20 // px delta in either axis = "moved"

// ── Diff ────────────────────────────────────────────────────────────────────

/**
 * Compute a visual diff between two graph states.
 * graphA is the "before" (base), graphB is the "after" (target).
 */
export function diffGraphs(graphA: SnapshotData, graphB: SnapshotData): DiffResult {
  const nodesA = new Map(graphA.nodes.map((n) => [n.id, n]))
  const nodesB = new Map(graphB.nodes.map((n) => [n.id, n]))

  const addedNodes: SnapshotNodeData[] = []
  const removedNodes: SnapshotNodeData[] = []
  const movedNodes: DiffResult['movedNodes'] = []
  const modifiedNodes: DiffResult['modifiedNodes'] = []
  const unchangedNodes: SnapshotNodeData[] = []

  // Nodes in B but not in A → added
  for (const [id, nodeB] of nodesB) {
    if (!nodesA.has(id)) {
      addedNodes.push(nodeB)
    }
  }

  // Nodes in A but not in B → removed
  for (const [id, nodeA] of nodesA) {
    if (!nodesB.has(id)) {
      removedNodes.push(nodeA)
    }
  }

  // Nodes in both → check for changes
  for (const [id, nodeA] of nodesA) {
    const nodeB = nodesB.get(id)
    if (!nodeB) continue

    const labelChanged = nodeA.label !== nodeB.label
    const positionChanged =
      Math.abs(nodeA.xPos - nodeB.xPos) > POSITION_THRESHOLD ||
      Math.abs(nodeA.yPos - nodeB.yPos) > POSITION_THRESHOLD

    if (labelChanged) {
      modifiedNodes.push({ node: nodeB, oldLabel: nodeA.label, newLabel: nodeB.label })
    } else if (positionChanged) {
      movedNodes.push({
        node: nodeB,
        fromX: nodeA.xPos,
        fromY: nodeA.yPos,
        toX: nodeB.xPos,
        toY: nodeB.yPos,
      })
    } else {
      unchangedNodes.push(nodeB)
    }
  }

  // Edge diff — match by fromNodeId + toNodeId pair
  const edgeKey = (e: SnapshotEdgeData) => `${e.fromNodeId}::${e.toNodeId}`
  const edgesA = new Map(graphA.edges.map((e) => [edgeKey(e), e]))
  const edgesB = new Map(graphB.edges.map((e) => [edgeKey(e), e]))

  const addedEdges: SnapshotEdgeData[] = []
  const removedEdges: SnapshotEdgeData[] = []
  const unchangedEdges: SnapshotEdgeData[] = []

  for (const [key, edgeB] of edgesB) {
    if (!edgesA.has(key)) {
      addedEdges.push(edgeB)
    } else {
      unchangedEdges.push(edgeB)
    }
  }
  for (const [key, edgeA] of edgesA) {
    if (!edgesB.has(key)) {
      removedEdges.push(edgeA)
    }
  }

  return {
    addedNodes,
    removedNodes,
    movedNodes,
    modifiedNodes,
    unchangedNodes,
    addedEdges,
    removedEdges,
    unchangedEdges,
  }
}

// ── Three-Way Merge ─────────────────────────────────────────────────────────

/**
 * Three-way merge: base (common ancestor) + source (snapshot changes) + target (current state).
 * Auto-merges non-conflicting adds/removes; flags conflicts when the same node
 * was modified differently in source vs target.
 */
export function mergeGraphs(
  base: SnapshotData,
  source: SnapshotData,
  target: SnapshotData,
): MergeResult {
  const baseNodes = new Map(base.nodes.map((n) => [n.id, n]))
  const sourceNodes = new Map(source.nodes.map((n) => [n.id, n]))
  const targetNodes = new Map(target.nodes.map((n) => [n.id, n]))

  const mergedNodesMap = new Map<string, SnapshotNodeData>()
  const conflicts: MergeConflict[] = []

  // Collect all node IDs across all three graphs
  const allNodeIds = new Set([
    ...baseNodes.keys(),
    ...sourceNodes.keys(),
    ...targetNodes.keys(),
  ])

  for (const id of allNodeIds) {
    const baseNode = baseNodes.get(id)
    const sourceNode = sourceNodes.get(id)
    const targetNode = targetNodes.get(id)

    // Added only in source → include
    if (!baseNode && sourceNode && !targetNode) {
      mergedNodesMap.set(id, sourceNode)
      continue
    }
    // Added only in target → include
    if (!baseNode && !sourceNode && targetNode) {
      mergedNodesMap.set(id, targetNode)
      continue
    }
    // Added in both → use target (current state takes priority for new nodes)
    if (!baseNode && sourceNode && targetNode) {
      mergedNodesMap.set(id, targetNode)
      continue
    }

    // Removed in source, present in target
    if (baseNode && !sourceNode && targetNode) {
      // Source deleted it — skip (accept deletion)
      continue
    }
    // Present in source, removed in target
    if (baseNode && sourceNode && !targetNode) {
      // Target deleted it — skip (accept deletion)
      continue
    }
    // Removed in both → skip
    if (baseNode && !sourceNode && !targetNode) {
      continue
    }

    // Present in all three — check for conflicts
    if (baseNode && sourceNode && targetNode) {
      const sourceChanged = sourceNode.label !== baseNode.label
      const targetChanged = targetNode.label !== baseNode.label

      if (sourceChanged && targetChanged && sourceNode.label !== targetNode.label) {
        // Conflict: both modified label differently
        conflicts.push({
          nodeId: id,
          field: 'label',
          baseValue: baseNode.label,
          sourceValue: sourceNode.label,
          targetValue: targetNode.label,
        })
      }

      // Check position conflicts
      const sourcePosMoved =
        Math.abs(sourceNode.xPos - baseNode.xPos) > POSITION_THRESHOLD ||
        Math.abs(sourceNode.yPos - baseNode.yPos) > POSITION_THRESHOLD
      const targetPosMoved =
        Math.abs(targetNode.xPos - baseNode.xPos) > POSITION_THRESHOLD ||
        Math.abs(targetNode.yPos - baseNode.yPos) > POSITION_THRESHOLD

      if (sourcePosMoved && targetPosMoved) {
        const samePos =
          Math.abs(sourceNode.xPos - targetNode.xPos) <= POSITION_THRESHOLD &&
          Math.abs(sourceNode.yPos - targetNode.yPos) <= POSITION_THRESHOLD
        if (!samePos) {
          conflicts.push({
            nodeId: id,
            field: 'position',
            baseValue: `${Math.round(baseNode.xPos)},${Math.round(baseNode.yPos)}`,
            sourceValue: `${Math.round(sourceNode.xPos)},${Math.round(sourceNode.yPos)}`,
            targetValue: `${Math.round(targetNode.xPos)},${Math.round(targetNode.yPos)}`,
          })
        }
      }

      // For the merged result, prefer target (current) unless only source changed
      let merged: SnapshotNodeData
      if (sourceChanged && !targetChanged) {
        merged = { ...targetNode, label: sourceNode.label }
      } else {
        merged = { ...targetNode }
      }
      if (sourcePosMoved && !targetPosMoved) {
        merged = { ...merged, xPos: sourceNode.xPos, yPos: sourceNode.yPos }
      }

      mergedNodesMap.set(id, merged)
    }
  }

  // Edge merge — auto-merge since edges are identified by endpoints
  const edgeKey = (e: SnapshotEdgeData) => `${e.fromNodeId}::${e.toNodeId}`
  const baseEdges = new Map(base.edges.map((e) => [edgeKey(e), e]))
  const sourceEdges = new Map(source.edges.map((e) => [edgeKey(e), e]))
  const targetEdges = new Map(target.edges.map((e) => [edgeKey(e), e]))

  const mergedEdgesMap = new Map<string, SnapshotEdgeData>()
  const allEdgeKeys = new Set([
    ...baseEdges.keys(),
    ...sourceEdges.keys(),
    ...targetEdges.keys(),
  ])

  for (const key of allEdgeKeys) {
    const baseEdge = baseEdges.get(key)
    const sourceEdge = sourceEdges.get(key)
    const targetEdge = targetEdges.get(key)

    // Added in source only → include
    if (!baseEdge && sourceEdge && !targetEdge) {
      // Only include if both endpoint nodes exist in merged result
      if (mergedNodesMap.has(sourceEdge.fromNodeId) && mergedNodesMap.has(sourceEdge.toNodeId)) {
        mergedEdgesMap.set(key, sourceEdge)
      }
      continue
    }
    // Added in target only → include
    if (!baseEdge && !sourceEdge && targetEdge) {
      if (mergedNodesMap.has(targetEdge.fromNodeId) && mergedNodesMap.has(targetEdge.toNodeId)) {
        mergedEdgesMap.set(key, targetEdge)
      }
      continue
    }
    // Added in both → use target
    if (!baseEdge && sourceEdge && targetEdge) {
      mergedEdgesMap.set(key, targetEdge)
      continue
    }

    // Removed in source → skip
    if (baseEdge && !sourceEdge) continue
    // Removed in target → skip
    if (baseEdge && !targetEdge) continue

    // Present in all three → keep target version
    if (baseEdge && sourceEdge && targetEdge) {
      if (mergedNodesMap.has(targetEdge.fromNodeId) && mergedNodesMap.has(targetEdge.toNodeId)) {
        mergedEdgesMap.set(key, targetEdge)
      }
    }
  }

  return {
    mergedNodes: Array.from(mergedNodesMap.values()),
    mergedEdges: Array.from(mergedEdgesMap.values()),
    conflicts,
  }
}
