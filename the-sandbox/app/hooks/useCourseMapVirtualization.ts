import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface VirtualNode {
  id: string
  xPos: number
  yPos: number
  archived: boolean
}

interface VirtualEdge {
  id: string
  fromNodeId: string
  toNodeId: string
}

interface ViewportBounds {
  scrollLeft: number
  scrollTop: number
  width: number
  height: number
}

interface UseCourseMapVirtualizationOptions {
  nodes: VirtualNode[]
  edges: VirtualEdge[]
  nodeWidth: number
  nodeHeight: number
  buffer?: number // px buffer around viewport, default 200
  enabled?: boolean
}

interface UseCourseMapVirtualizationReturn {
  visibleNodes: VirtualNode[]
  visibleEdges: VirtualEdge[]
  visibleNodeIds: Set<string>
  totalNodeCount: number
  visibleNodeCount: number
  showLargeMapWarning: boolean
  nodeCountLabel: string
  updateViewport: (bounds: ViewportBounds) => void
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

// ── Grid-based spatial index ───────────────────────────────────────────────

const GRID_CELL_SIZE = 300 // px per grid cell

interface SpatialGrid {
  cells: Map<string, VirtualNode[]>
  cellSize: number
}

function buildSpatialGrid(nodes: VirtualNode[], nodeWidth: number, nodeHeight: number): SpatialGrid {
  const cells = new Map<string, VirtualNode[]>()

  for (const node of nodes) {
    if (node.archived) continue
    // A node can span multiple grid cells
    const minCol = Math.floor(node.xPos / GRID_CELL_SIZE)
    const maxCol = Math.floor((node.xPos + nodeWidth) / GRID_CELL_SIZE)
    const minRow = Math.floor(node.yPos / GRID_CELL_SIZE)
    const maxRow = Math.floor((node.yPos + nodeHeight) / GRID_CELL_SIZE)

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`
        const existing = cells.get(key)
        if (existing) {
          existing.push(node)
        } else {
          cells.set(key, [node])
        }
      }
    }
  }

  return { cells, cellSize: GRID_CELL_SIZE }
}

function queryGrid(grid: SpatialGrid, bounds: ViewportBounds, buffer: number): Set<string> {
  const ids = new Set<string>()
  const left = bounds.scrollLeft - buffer
  const top = bounds.scrollTop - buffer
  const right = bounds.scrollLeft + bounds.width + buffer
  const bottom = bounds.scrollTop + bounds.height + buffer

  const minCol = Math.floor(left / grid.cellSize)
  const maxCol = Math.floor(right / grid.cellSize)
  const minRow = Math.floor(top / grid.cellSize)
  const maxRow = Math.floor(bottom / grid.cellSize)

  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const key = `${col},${row}`
      const cellNodes = grid.cells.get(key)
      if (cellNodes) {
        for (const node of cellNodes) {
          ids.add(node.id)
        }
      }
    }
  }

  return ids
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCourseMapVirtualization(options: UseCourseMapVirtualizationOptions): UseCourseMapVirtualizationReturn {
  const {
    nodes,
    edges,
    nodeWidth,
    nodeHeight,
    buffer = 200,
    enabled = true,
  } = options

  const [viewport, setViewport] = useState<ViewportBounds>({
    scrollLeft: 0,
    scrollTop: 0,
    width: 1200,
    height: 800,
  })

  const lastScrollTimeRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  // Build spatial grid when nodes change
  const spatialGrid = useMemo(() => {
    const activeNodes = nodes.filter((n) => !n.archived)
    return buildSpatialGrid(activeNodes, nodeWidth, nodeHeight)
  }, [nodes, nodeWidth, nodeHeight])

  const activeNodes = useMemo(() => nodes.filter((n) => !n.archived), [nodes])

  // Query visible nodes from grid — O(1) per viewport cell
  const visibleNodeIds = useMemo(() => {
    if (!enabled || activeNodes.length < 50) {
      // Don't virtualize small maps
      return new Set(activeNodes.map((n) => n.id))
    }
    return queryGrid(spatialGrid, viewport, buffer)
  }, [enabled, activeNodes, spatialGrid, viewport, buffer])

  const visibleNodes = useMemo(() => {
    if (!enabled || activeNodes.length < 50) return activeNodes
    return activeNodes.filter((n) => visibleNodeIds.has(n.id))
  }, [enabled, activeNodes, visibleNodeIds])

  // Visible edges: at least one endpoint visible
  const visibleEdges = useMemo(() => {
    if (!enabled || activeNodes.length < 50) return edges
    return edges.filter((e) => visibleNodeIds.has(e.fromNodeId) || visibleNodeIds.has(e.toNodeId))
  }, [enabled, edges, activeNodes.length, visibleNodeIds])

  const totalNodeCount = activeNodes.length
  const visibleNodeCount = visibleNodes.length
  const showLargeMapWarning = totalNodeCount > 200

  const nodeCountLabel = enabled && totalNodeCount >= 50
    ? `Showing ${visibleNodeCount} of ${totalNodeCount} nodes`
    : `${totalNodeCount} node${totalNodeCount !== 1 ? 's' : ''}`

  // Update viewport bounds
  const updateViewport = useCallback((bounds: ViewportBounds) => {
    setViewport(bounds)
  }, [])

  // Throttled scroll handler (~60fps / 16ms)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const now = performance.now()

    if (now - lastScrollTimeRef.current < 16) {
      // Schedule on next frame if we're throttling
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setViewport({
          scrollLeft: target.scrollLeft,
          scrollTop: target.scrollTop,
          width: target.clientWidth,
          height: target.clientHeight,
        })
        lastScrollTimeRef.current = performance.now()
      })
      return
    }

    lastScrollTimeRef.current = now
    setViewport({
      scrollLeft: target.scrollLeft,
      scrollTop: target.scrollTop,
      width: target.clientWidth,
      height: target.clientHeight,
    })
  }, [])

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return {
    visibleNodes: visibleNodes as VirtualNode[],
    visibleEdges: visibleEdges as VirtualEdge[],
    visibleNodeIds,
    totalNodeCount,
    visibleNodeCount,
    showLargeMapWarning,
    nodeCountLabel,
    updateViewport,
    handleScroll,
  }
}
