'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Eye, EyeOff, ZoomIn } from 'lucide-react'
import {
  VisualizationService,
  type VisNode,
  type VisEdge,
  type CanvasSize,
  type ViewportRect,
} from '../../lib/course-map/visualization-service'

// ── Types ────────────────────────────────────────────────────────────────────

interface MinimapNavigatorProps {
  nodes: VisNode[]
  edges: VisEdge[]
  canvasSize: CanvasSize
  viewportRect: ViewportRect
  zoom: number
  onPan: (scrollLeft: number, scrollTop: number) => void
  edgeColors?: Record<string, string>
}

// ── Constants ────────────────────────────────────────────────────────────────

const MINIMAP_WIDTH = 200
const MINIMAP_HEIGHT = 150
const NODE_DOT_SIZE = 6

const DEFAULT_EDGE_COLORS: Record<string, string> = {
  PREREQUISITE: '#dc2626',
  SEQUENCE: '#2563eb',
  CONCURRENT: '#9333ea',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MinimapNavigator({
  nodes,
  edges,
  canvasSize,
  viewportRect,
  zoom,
  onPan,
  edgeColors = DEFAULT_EDGE_COLORS,
}: MinimapNavigatorProps) {
  const [visible, setVisible] = useState(true)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeNodes = nodes.filter((n) => !n.archived)

  // Calculate minimap viewport
  const viewport = VisualizationService.calculateMinimapViewport(
    nodes,
    canvasSize,
    viewportRect,
  )

  // Scale factors: canvas → minimap
  const scaleX = canvasSize.width > 0 ? MINIMAP_WIDTH / canvasSize.width : 1
  const scaleY = canvasSize.height > 0 ? MINIMAP_HEIGHT / canvasSize.height : 1

  // Handle minimap click/drag to pan main canvas
  const handlePan = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const minimapX = clientX - rect.left
      const minimapY = clientY - rect.top

      // Convert minimap coords to canvas scroll position
      const canvasX = (minimapX / MINIMAP_WIDTH) * canvasSize.width - viewportRect.width / 2
      const canvasY = (minimapY / MINIMAP_HEIGHT) * canvasSize.height - viewportRect.height / 2

      onPan(
        Math.max(0, Math.min(canvasX, canvasSize.width - viewportRect.width)),
        Math.max(0, Math.min(canvasY, canvasSize.height - viewportRect.height)),
      )
    },
    [canvasSize, viewportRect, onPan],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setDragging(true)
      handlePan(e.clientX, e.clientY)
    },
    [handlePan],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return
      handlePan(e.clientX, e.clientY)
    },
    [dragging, handlePan],
  )

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  // Release drag on window mouseup
  useEffect(() => {
    if (!dragging) return
    const up = () => setDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [dragging])

  // Build node map for edge rendering
  const nodeMap = new Map(activeNodes.map((n) => [n.id, n]))

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors print:hidden"
        title="Show minimap"
      >
        <Eye className="size-4" />
        Minimap
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden" style={{ width: MINIMAP_WIDTH + 4 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-white border-2 border-b-0 border-gray-200 rounded-t-xl">
        <span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1">
          <ZoomIn className="size-3" />
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setVisible(false)}
          className="p-0.5 rounded hover:bg-gray-100 transition-colors"
          title="Hide minimap"
        >
          <EyeOff className="size-3 text-gray-400" />
        </button>
      </div>

      {/* Minimap canvas */}
      <div
        ref={containerRef}
        className="relative bg-gray-50 border-2 border-gray-200 rounded-b-xl overflow-hidden select-none"
        style={{
          width: MINIMAP_WIDTH,
          height: MINIMAP_HEIGHT,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Edge lines */}
        <svg
          className="absolute inset-0"
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          style={{ pointerEvents: 'none' }}
        >
          {edges.map((edge) => {
            const from = nodeMap.get(edge.fromNodeId)
            const to = nodeMap.get(edge.toNodeId)
            if (!from || !to) return null

            const x1 = from.xPos * scaleX + (NODE_DOT_SIZE * scaleX) / 2
            const y1 = from.yPos * scaleY + (NODE_DOT_SIZE * scaleY) / 2
            const x2 = to.xPos * scaleX + (NODE_DOT_SIZE * scaleX) / 2
            const y2 = to.yPos * scaleY + (NODE_DOT_SIZE * scaleY) / 2

            return (
              <line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={edgeColors[edge.edgeType] || '#9ca3af'}
                strokeWidth={0.5}
                opacity={0.4}
              />
            )
          })}
        </svg>

        {/* Node dots */}
        {activeNodes.map((node) => (
          <div
            key={node.id}
            className="absolute rounded-sm bg-[#0033A0]"
            style={{
              left: node.xPos * scaleX,
              top: node.yPos * scaleY,
              width: Math.max(3, 240 * scaleX),
              height: Math.max(2, 80 * scaleY),
              opacity: 0.6,
            }}
          />
        ))}

        {/* Viewport rectangle overlay */}
        <div
          className="absolute border-2 border-[#0033A0] bg-[#0033A0]/5"
          style={{
            left: viewport.x * MINIMAP_WIDTH,
            top: viewport.y * MINIMAP_HEIGHT,
            width: viewport.width * MINIMAP_WIDTH,
            height: viewport.height * MINIMAP_HEIGHT,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
