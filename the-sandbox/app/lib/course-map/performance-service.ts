/**
 * Course Map Performance Service
 *
 * Virtualization for 500+ node maps, edge batching, Canvas 2D fallback,
 * lazy off-screen loading, frame budget management, and render metrics.
 */

import {
  trackRenderTime,
  getPerformanceReport,
  type PerformanceReport,
} from './perf-monitor'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PerfNode {
  id: string
  xPos: number
  yPos: number
  label: string
  archived: boolean
}

export interface PerfEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export interface PerfViewportRect {
  scrollLeft: number
  scrollTop: number
  width: number
  height: number
}

export interface VirtualizedResult {
  visibleNodeIds: Set<string>
  totalNodes: number
  visibleCount: number
}

export interface BatchedEdges {
  visibleEdges: PerfEdge[]
  totalEdges: number
  visibleCount: number
}

export interface FrameBudgetState {
  targetFPS: number
  currentFPS: number
  avgFrameTime: number
  overBudget: boolean
  skipLowPriority: boolean
}

export interface RenderMetrics {
  fps: number
  frameTime: number
  nodeCount: number
  visibleNodeCount: number
  edgeCount: number
  performanceGrade: 'green' | 'yellow' | 'red'
}

// ── Constants ────────────────────────────────────────────────────────────────

const GRID_CELL_SIZE = 300
const DEFAULT_BUFFER = 300 // Larger buffer for 500+ maps
const VIRTUALIZATION_THRESHOLD = 100
const LAZY_LOAD_DISTANCE = 600 // px beyond viewport to start loading

// ── Spatial Grid (enhanced for large maps) ───────────────────────────────────

interface SpatialCell {
  nodeIds: string[]
}

function buildGrid(nodes: PerfNode[], nodeWidth: number, nodeHeight: number): Map<string, SpatialCell> {
  const cells = new Map<string, SpatialCell>()

  for (const node of nodes) {
    if (node.archived) continue
    const minCol = Math.floor(node.xPos / GRID_CELL_SIZE)
    const maxCol = Math.floor((node.xPos + nodeWidth) / GRID_CELL_SIZE)
    const minRow = Math.floor(node.yPos / GRID_CELL_SIZE)
    const maxRow = Math.floor((node.yPos + nodeHeight) / GRID_CELL_SIZE)

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`
        const cell = cells.get(key)
        if (cell) {
          cell.nodeIds.push(node.id)
        } else {
          cells.set(key, { nodeIds: [node.id] })
        }
      }
    }
  }

  return cells
}

function queryVisibleIds(
  grid: Map<string, SpatialCell>,
  viewport: PerfViewportRect,
  buffer: number,
): Set<string> {
  const ids = new Set<string>()
  const left = viewport.scrollLeft - buffer
  const top = viewport.scrollTop - buffer
  const right = viewport.scrollLeft + viewport.width + buffer
  const bottom = viewport.scrollTop + viewport.height + buffer

  const minCol = Math.floor(left / GRID_CELL_SIZE)
  const maxCol = Math.floor(right / GRID_CELL_SIZE)
  const minRow = Math.floor(top / GRID_CELL_SIZE)
  const maxRow = Math.floor(bottom / GRID_CELL_SIZE)

  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const cell = grid.get(`${col},${row}`)
      if (cell) {
        for (const id of cell.nodeIds) {
          ids.add(id)
        }
      }
    }
  }

  return ids
}

// ── PerformanceService ───────────────────────────────────────────────────────

export class PerformanceService {
  private grid: Map<string, SpatialCell> = new Map()
  private nodeWidth = 240
  private nodeHeight = 80
  private frameTimes: number[] = []
  private lastFrameTime = 0
  private rafId: number | null = null
  private _budgetState: FrameBudgetState = {
    targetFPS: 60,
    currentFPS: 60,
    avgFrameTime: 16.67,
    overBudget: false,
    skipLowPriority: false,
  }

  /**
   * Create a virtualized renderer for large maps.
   * Returns visible node IDs based on viewport position.
   */
  createVirtualizedRenderer(
    nodes: PerfNode[],
    viewportRect: PerfViewportRect,
    buffer = DEFAULT_BUFFER,
  ): VirtualizedResult {
    const active = nodes.filter((n) => !n.archived)

    if (active.length < VIRTUALIZATION_THRESHOLD) {
      return {
        visibleNodeIds: new Set(active.map((n) => n.id)),
        totalNodes: active.length,
        visibleCount: active.length,
      }
    }

    // Rebuild grid (could cache based on node positions hash)
    this.grid = buildGrid(active, this.nodeWidth, this.nodeHeight)
    const visibleNodeIds = queryVisibleIds(this.grid, viewportRect, buffer)

    return {
      visibleNodeIds,
      totalNodes: active.length,
      visibleCount: visibleNodeIds.size,
    }
  }

  /**
   * Batch edge rendering — only return edges where at least one endpoint is visible.
   */
  batchEdgeRendering(
    edges: PerfEdge[],
    visibleNodeIds: Set<string>,
  ): BatchedEdges {
    const visibleEdges = edges.filter(
      (e) => visibleNodeIds.has(e.fromNodeId) || visibleNodeIds.has(e.toNodeId),
    )

    return {
      visibleEdges,
      totalEdges: edges.length,
      visibleCount: visibleEdges.length,
    }
  }

  /**
   * Canvas 2D fallback renderer for extreme node counts (1000+).
   * Draws simple rectangles and lines on a Canvas element.
   */
  createCanvasFallbackRenderer(
    nodes: PerfNode[],
    edges: PerfEdge[],
    canvasElement: HTMLCanvasElement,
    edgeColors: Record<string, string> = {},
  ): void {
    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    const active = nodes.filter((n) => !n.archived)
    const nodeMap = new Map(active.map((n) => [n.id, n]))

    // Clear
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)

    // Draw edges
    ctx.lineWidth = 1.5
    for (const edge of edges) {
      const from = nodeMap.get(edge.fromNodeId)
      const to = nodeMap.get(edge.toNodeId)
      if (!from || !to) continue

      ctx.strokeStyle = edgeColors[edge.edgeType] || '#9ca3af'
      ctx.beginPath()
      const fromX = from.xPos + this.nodeWidth / 2
      const fromY = from.yPos + this.nodeHeight
      const toX = to.xPos + this.nodeWidth / 2
      const toY = to.yPos
      const midY = (fromY + toY) / 2
      ctx.moveTo(fromX, fromY)
      ctx.bezierCurveTo(fromX, midY, toX, midY, toX, toY)
      ctx.stroke()
    }

    // Draw nodes
    for (const node of active) {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 2

      const x = node.xPos
      const y = node.yPos
      const w = this.nodeWidth
      const h = this.nodeHeight
      const r = 12 // border-radius

      // Rounded rect
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Label text
      ctx.fillStyle = '#111827'
      ctx.font = '12px system-ui, sans-serif'
      ctx.textBaseline = 'middle'
      const maxTextWidth = w - 16
      let label = node.label
      while (ctx.measureText(label).width > maxTextWidth && label.length > 3) {
        label = label.slice(0, -4) + '...'
      }
      ctx.fillText(label, x + 8, y + h / 2)
    }
  }

  /**
   * Lazy-load off-screen nodes as user scrolls close.
   * Returns node IDs that should start loading content.
   */
  lazyLoadOffscreenNodes(
    nodes: PerfNode[],
    viewportRect: PerfViewportRect,
    loadDistance = LAZY_LOAD_DISTANCE,
  ): Set<string> {
    const loadZoneIds = new Set<string>()
    const active = nodes.filter((n) => !n.archived)

    const left = viewportRect.scrollLeft - loadDistance
    const top = viewportRect.scrollTop - loadDistance
    const right = viewportRect.scrollLeft + viewportRect.width + loadDistance
    const bottom = viewportRect.scrollTop + viewportRect.height + loadDistance

    for (const node of active) {
      const nodeRight = node.xPos + this.nodeWidth
      const nodeBottom = node.yPos + this.nodeHeight
      if (nodeRight >= left && node.xPos <= right && nodeBottom >= top && node.yPos <= bottom) {
        loadZoneIds.add(node.id)
      }
    }

    return loadZoneIds
  }

  /**
   * Frame budget manager — tracks render times and determines if
   * low-priority updates should be skipped to maintain target FPS.
   */
  frameBudgetManager(targetFPS = 60): FrameBudgetState {
    const targetFrameTime = 1000 / targetFPS
    const now = performance.now()

    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime
      this.frameTimes.push(frameTime)
      // Keep last 60 frames
      if (this.frameTimes.length > 60) this.frameTimes.shift()
    }
    this.lastFrameTime = now

    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((s, t) => s + t, 0) / this.frameTimes.length
      : targetFrameTime

    const currentFPS = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : targetFPS
    const overBudget = avgFrameTime > targetFrameTime * 1.2 // 20% over budget
    const skipLowPriority = avgFrameTime > targetFrameTime * 1.5 // 50% over → skip animations

    this._budgetState = {
      targetFPS,
      currentFPS,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      overBudget,
      skipLowPriority,
    }

    return this._budgetState
  }

  /**
   * Get current budget state without updating.
   */
  get budgetState(): FrameBudgetState {
    return this._budgetState
  }

  /**
   * Measure current render performance and return grade.
   */
  measureRenderPerformance(
    totalNodes: number,
    visibleNodes: number,
    totalEdges: number,
  ): RenderMetrics {
    const budget = this._budgetState
    const report = getPerformanceReport()

    // Track this measurement
    trackRenderTime('PerformanceService.measure', budget.avgFrameTime)

    let performanceGrade: 'green' | 'yellow' | 'red' = 'green'
    if (budget.currentFPS < 30) {
      performanceGrade = 'red'
    } else if (budget.currentFPS < 50) {
      performanceGrade = 'yellow'
    }

    return {
      fps: budget.currentFPS,
      frameTime: budget.avgFrameTime,
      nodeCount: totalNodes,
      visibleNodeCount: visibleNodes,
      edgeCount: totalEdges,
      performanceGrade,
    }
  }

  /**
   * Start the frame budget tracking loop.
   */
  startTracking(targetFPS = 60): void {
    if (typeof window === 'undefined') return
    const tick = () => {
      this.frameBudgetManager(targetFPS)
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  /**
   * Stop the frame budget tracking loop.
   */
  stopTracking(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.frameTimes = []
    this.lastFrameTime = 0
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stopTracking()
    this.grid.clear()
  }
}
