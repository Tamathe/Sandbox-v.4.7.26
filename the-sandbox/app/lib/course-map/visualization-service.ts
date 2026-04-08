/**
 * Course Map Visualization Service
 *
 * Advanced visualization: minimap viewport, zoom-to-fit, node grouping,
 * edge routing (bezier/orthogonal/step), and node shape variants.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface VisNode {
  id: string
  xPos: number
  yPos: number
  label: string
  nodeType: string
  archived: boolean
  courseUnitId: string | null
}

export interface VisEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export interface CanvasSize {
  width: number
  height: number
}

export interface ViewportRect {
  scrollLeft: number
  scrollTop: number
  width: number
  height: number
}

export interface MinimapViewport {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
}

export interface ZoomFitResult {
  zoom: number
  panX: number
  panY: number
}

export interface GroupBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface NodeGroup {
  id: string
  label: string
  nodeIds: string[]
  boundingBox: GroupBoundingBox
  color: string
  collapsed: boolean
}

export interface GroupedNodeSet {
  groups: NodeGroup[]
  ungroupedNodeIds: string[]
}

export type NodeShape = 'rect' | 'diamond' | 'hexagon' | 'circle' | 'pill'

export type EdgeRoutingMode = 'bezier' | 'orthogonal' | 'step'

// ── Constants ────────────────────────────────────────────────────────────────

const GROUP_PADDING = 40
const GROUP_HEADER_HEIGHT = 32

const GROUP_COLORS: Record<string, string> = {
  LECTURE: 'rgba(59, 130, 246, 0.08)',    // blue
  LAB: 'rgba(34, 197, 94, 0.08)',         // green
  EXAM: 'rgba(239, 68, 68, 0.08)',        // red
  QUIZ: 'rgba(245, 158, 11, 0.08)',       // amber
  ASSIGNMENT: 'rgba(99, 102, 241, 0.08)', // indigo
  DISCUSSION: 'rgba(168, 85, 247, 0.08)', // purple
  OTHER: 'rgba(107, 114, 128, 0.08)',     // gray
}

const GROUP_BORDER_COLORS: Record<string, string> = {
  LECTURE: 'rgba(59, 130, 246, 0.3)',
  LAB: 'rgba(34, 197, 94, 0.3)',
  EXAM: 'rgba(239, 68, 68, 0.3)',
  QUIZ: 'rgba(245, 158, 11, 0.3)',
  ASSIGNMENT: 'rgba(99, 102, 241, 0.3)',
  DISCUSSION: 'rgba(168, 85, 247, 0.3)',
  OTHER: 'rgba(107, 114, 128, 0.3)',
}

const NODE_SHAPE_MAP: Record<string, NodeShape> = {
  LECTURE: 'rect',
  LAB: 'hexagon',
  EXAM: 'diamond',
  QUIZ: 'diamond',
  ASSIGNMENT: 'rect',
  DISCUSSION: 'pill',
  OTHER: 'circle',
}

const COLLAPSED_GROUP_STORAGE_KEY = 'course-map-collapsed-groups'

// ── Collapsed group persistence ──────────────────────────────────────────────

function getCollapsedGroups(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(COLLAPSED_GROUP_STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function setCollapsedGroups(collapsed: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COLLAPSED_GROUP_STORAGE_KEY, JSON.stringify([...collapsed]))
  } catch { /* quota exceeded — ignore */ }
}

// ── VisualizationService ─────────────────────────────────────────────────────

export class VisualizationService {
  /**
   * Calculate minimap viewport proportions relative to the full canvas.
   */
  static calculateMinimapViewport(
    nodes: VisNode[],
    canvasSize: CanvasSize,
    viewportRect: ViewportRect,
  ): MinimapViewport {
    const active = nodes.filter((n) => !n.archived)
    if (active.length === 0) {
      return { x: 0, y: 0, width: 1, height: 1, scaleX: 1, scaleY: 1 }
    }

    const scaleX = 1 / canvasSize.width
    const scaleY = 1 / canvasSize.height

    return {
      x: (viewportRect.scrollLeft / canvasSize.width),
      y: (viewportRect.scrollTop / canvasSize.height),
      width: Math.min(1, viewportRect.width / canvasSize.width),
      height: Math.min(1, viewportRect.height / canvasSize.height),
      scaleX,
      scaleY,
    }
  }

  /**
   * Compute zoom level and pan offsets to fit all nodes in the viewport.
   */
  static zoomToFit(
    nodes: VisNode[],
    canvasSize: CanvasSize,
    padding = 60,
  ): ZoomFitResult {
    const active = nodes.filter((n) => !n.archived)
    if (active.length === 0) return { zoom: 1, panX: 0, panY: 0 }

    const minX = Math.min(...active.map((n) => n.xPos))
    const minY = Math.min(...active.map((n) => n.yPos))
    const maxX = Math.max(...active.map((n) => n.xPos + 240)) // NODE_WIDTH
    const maxY = Math.max(...active.map((n) => n.yPos + 80))  // NODE_HEIGHT

    const contentWidth = maxX - minX + padding * 2
    const contentHeight = maxY - minY + padding * 2

    const zoom = Math.min(
      1,
      canvasSize.width / contentWidth,
      canvasSize.height / contentHeight,
    )

    const panX = minX - padding
    const panY = minY - padding

    return { zoom, panX, panY }
  }

  /**
   * Group nodes by a grouping key (unitType, module, or custom).
   */
  static groupNodes(
    nodes: VisNode[],
    groupBy: 'unitType' | 'module' | 'custom',
    unitMap?: Map<string, { unitType: string; label: string }>,
  ): GroupedNodeSet {
    const active = nodes.filter((n) => !n.archived)
    const collapsed = getCollapsedGroups()
    const groupMap = new Map<string, VisNode[]>()

    for (const node of active) {
      let key: string
      if (groupBy === 'unitType') {
        const unit = node.courseUnitId && unitMap ? unitMap.get(node.courseUnitId) : null
        key = unit?.unitType || 'OTHER'
      } else if (groupBy === 'module') {
        key = node.courseUnitId || 'ungrouped'
      } else {
        key = node.nodeType || 'OTHER'
      }
      const existing = groupMap.get(key)
      if (existing) {
        existing.push(node)
      } else {
        groupMap.set(key, [node])
      }
    }

    const groups: NodeGroup[] = []
    const ungroupedNodeIds: string[] = []

    for (const [key, groupNodes] of groupMap) {
      if (groupNodes.length < 2) {
        ungroupedNodeIds.push(...groupNodes.map((n) => n.id))
        continue
      }

      const minX = Math.min(...groupNodes.map((n) => n.xPos))
      const minY = Math.min(...groupNodes.map((n) => n.yPos))
      const maxX = Math.max(...groupNodes.map((n) => n.xPos + 240))
      const maxY = Math.max(...groupNodes.map((n) => n.yPos + 80))

      const label = groupBy === 'module' && unitMap
        ? (unitMap.get(key)?.label || key)
        : key

      groups.push({
        id: `group-${key}`,
        label,
        nodeIds: groupNodes.map((n) => n.id),
        boundingBox: {
          x: minX - GROUP_PADDING,
          y: minY - GROUP_PADDING - GROUP_HEADER_HEIGHT,
          width: maxX - minX + GROUP_PADDING * 2,
          height: maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT,
        },
        color: GROUP_COLORS[key] || GROUP_COLORS.OTHER,
        collapsed: collapsed.has(`group-${key}`),
      })
    }

    return { groups, ungroupedNodeIds }
  }

  /**
   * Collapse a group — hides individual nodes, shows summary node.
   */
  static collapseGroup(groupId: string): void {
    const collapsed = getCollapsedGroups()
    collapsed.add(groupId)
    setCollapsedGroups(collapsed)
  }

  /**
   * Expand a group — shows individual nodes again.
   */
  static expandGroup(groupId: string): void {
    const collapsed = getCollapsedGroups()
    collapsed.delete(groupId)
    setCollapsedGroups(collapsed)
  }

  /**
   * Check if a group is collapsed.
   */
  static isGroupCollapsed(groupId: string): boolean {
    return getCollapsedGroups().has(groupId)
  }

  /**
   * Generate bezier curve SVG path data between two points.
   */
  static routeEdgeBezier(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    controlPointOffset = 0.5,
  ): string {
    const midY = fromY + (toY - fromY) * controlPointOffset
    return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`
  }

  /**
   * Generate orthogonal (axis-aligned) SVG path data avoiding overlaps.
   */
  static routeEdgeOrthogonal(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    _nodes?: VisNode[],
  ): string {
    const midY = (fromY + toY) / 2
    // Axis-aligned path: down from source, horizontal, down to target
    return `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`
  }

  /**
   * Generate stepped/staircase SVG path data.
   */
  static routeEdgeStep(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): string {
    const stepY = fromY + (toY - fromY) * 0.5
    // Step pattern: down, horizontal step, down
    return `M ${fromX} ${fromY} L ${fromX} ${stepY} L ${toX} ${stepY} L ${toX} ${toY}`
  }

  /**
   * Compute edge path using the selected routing mode.
   */
  static routeEdge(
    from: { xPos: number; yPos: number },
    to: { xPos: number; yPos: number },
    nodeWidth: number,
    nodeHeight: number,
    mode: EdgeRoutingMode,
    nodes?: VisNode[],
  ): string {
    const fromX = from.xPos + nodeWidth / 2
    const fromY = from.yPos + nodeHeight
    const toX = to.xPos + nodeWidth / 2
    const toY = to.yPos

    switch (mode) {
      case 'orthogonal':
        return this.routeEdgeOrthogonal(fromX, fromY, toX, toY, nodes)
      case 'step':
        return this.routeEdgeStep(fromX, fromY, toX, toY)
      case 'bezier':
      default:
        return this.routeEdgeBezier(fromX, fromY, toX, toY)
    }
  }

  /**
   * Get the shape variant for a given node type.
   */
  static getNodeShape(nodeType: string): NodeShape {
    return NODE_SHAPE_MAP[nodeType] || 'rect'
  }

  /**
   * Get the border-radius CSS for a given shape.
   */
  static getShapeBorderRadius(shape: NodeShape): string {
    switch (shape) {
      case 'circle': return '50%'
      case 'pill': return '9999px'
      case 'diamond': return '4px'
      case 'hexagon': return '8px'
      case 'rect':
      default: return '16px' // rounded-2xl equivalent
    }
  }

  /**
   * Get group border color for a unit type key.
   */
  static getGroupBorderColor(key: string): string {
    return GROUP_BORDER_COLORS[key] || GROUP_BORDER_COLORS.OTHER
  }

  /**
   * Get group fill color for a unit type key.
   */
  static getGroupFillColor(key: string): string {
    return GROUP_COLORS[key] || GROUP_COLORS.OTHER
  }
}
