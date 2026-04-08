'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { GraphNode, GraphEdge } from '../../lib/uknow-insights-service'

// ─── Force-directed layout (pure SVG, no dependencies) ──────────────────────

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

const TYPE_COLORS: Record<string, string> = {
  person: '#7c3aed',     // purple-600
  department: '#059669',  // emerald-600
  topic: '#0033A0',      // UK blue
}

const TYPE_BG: Record<string, string> = {
  person: '#f3e8ff',
  department: '#d1fae5',
  topic: '#dbeafe',
}

function initSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): { simNodes: SimNode[]; edgeIndices: Array<[number, number, number]> } {
  const cx = width / 2
  const cy = height / 2

  // Place nodes in a circle initially
  const simNodes: SimNode[] = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const r = Math.min(width, height) * 0.35
    return {
      ...n,
      x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
    }
  })

  // Pre-compute edge indices
  const nodeIndex = new Map(simNodes.map((n, i) => [n.id, i]))
  const edgeIndices: Array<[number, number, number]> = []
  for (const e of edges) {
    const si = nodeIndex.get(e.source)
    const ti = nodeIndex.get(e.target)
    if (si !== undefined && ti !== undefined) {
      edgeIndices.push([si, ti, e.weight])
    }
  }

  return { simNodes, edgeIndices }
}

function simulate(
  nodes: SimNode[],
  edgeIndices: Array<[number, number, number]>,
  width: number,
  height: number
) {
  const cx = width / 2
  const cy = height / 2
  const repulsion = 800
  const attraction = 0.005
  const damping = 0.85
  const centerPull = 0.01

  // Repulsion (all pairs)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const distSq = dx * dx + dy * dy + 1
      const force = repulsion / distSq
      const fx = dx * force
      const fy = dy * force
      nodes[i].vx += fx
      nodes[i].vy += fy
      nodes[j].vx -= fx
      nodes[j].vy -= fy
    }
  }

  // Attraction (edges)
  for (const [si, ti, weight] of edgeIndices) {
    const dx = nodes[ti].x - nodes[si].x
    const dy = nodes[ti].y - nodes[si].y
    const force = attraction * weight
    nodes[si].vx += dx * force
    nodes[si].vy += dy * force
    nodes[ti].vx -= dx * force
    nodes[ti].vy -= dy * force
  }

  // Center gravity + update positions
  for (const n of nodes) {
    n.vx += (cx - n.x) * centerPull
    n.vy += (cy - n.y) * centerPull
    n.vx *= damping
    n.vy *= damping
    n.x += n.vx
    n.y += n.vy
    // Clamp to bounds
    n.x = Math.max(40, Math.min(width - 40, n.x))
    n.y = Math.max(40, Math.min(height - 40, n.y))
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KnowledgeGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [edgeIndices, setEdgeIndices] = useState<Array<[number, number, number]>>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const frameRef = useRef(0)
  const iterRef = useRef(0)

  const WIDTH = 700
  const HEIGHT = 420

  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight))

  // Initialize simulation
  useEffect(() => {
    const { simNodes: sn, edgeIndices: ei } = initSimulation(nodes, edges, WIDTH, HEIGHT)
    setSimNodes(sn)
    setEdgeIndices(ei)
    setSettled(false)
    iterRef.current = 0
  }, [nodes, edges])

  // Run simulation
  const tick = useCallback(() => {
    if (settled) return
    setSimNodes((prev) => {
      const copy = prev.map((n) => ({ ...n }))
      simulate(copy, edgeIndices, WIDTH, HEIGHT)
      return copy
    })
    iterRef.current++
    if (iterRef.current > 120) {
      setSettled(true)
    } else {
      frameRef.current = requestAnimationFrame(tick)
    }
  }, [edgeIndices, settled])

  useEffect(() => {
    if (simNodes.length > 0 && !settled) {
      frameRef.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(frameRef.current)
  }, [simNodes.length, settled, tick])

  if (simNodes.length === 0) return null

  const nodeRadius = (weight: number) => {
    const ratio = weight / maxWeight
    return 6 + ratio * 14
  }

  return (
    <div className="w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        style={{ maxHeight: 420 }}
      >
        {/* Edges */}
        {edgeIndices.map(([si, ti, weight], i) => {
          const source = simNodes[si]
          const target = simNodes[ti]
          if (!source || !target) return null
          const isHighlighted =
            hoveredNode === source.id || hoveredNode === target.id
          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isHighlighted ? '#0033A0' : '#d1d5db'}
              strokeWidth={Math.max(1, Math.min(weight, 4))}
              strokeOpacity={isHighlighted ? 0.8 : 0.4}
            />
          )
        })}

        {/* Nodes */}
        {simNodes.map((n) => {
          const r = nodeRadius(n.weight)
          const isHovered = hoveredNode === n.id
          const isConnected =
            hoveredNode !== null &&
            edgeIndices.some(
              ([si, ti]) =>
                (simNodes[si]?.id === hoveredNode && simNodes[ti]?.id === n.id) ||
                (simNodes[ti]?.id === hoveredNode && simNodes[si]?.id === n.id)
            )
          const dimmed = hoveredNode !== null && !isHovered && !isConnected

          return (
            <g
              key={n.id}
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer', opacity: dimmed ? 0.2 : 1, transition: 'opacity 0.2s' }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={TYPE_BG[n.type] ?? '#f9fafb'}
                stroke={TYPE_COLORS[n.type] ?? '#6b7280'}
                strokeWidth={isHovered ? 2.5 : 1.5}
              />
              {/* Label (only show for larger nodes or hovered) */}
              {(r > 10 || isHovered) && (
                <text
                  x={n.x}
                  y={n.y + r + 12}
                  textAnchor="middle"
                  fontSize={isHovered ? 11 : 9}
                  fontWeight={isHovered ? 700 : 500}
                  fill={TYPE_COLORS[n.type] ?? '#374151'}
                >
                  {n.label.length > 20 ? n.label.slice(0, 18) + '…' : n.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Tooltip for hovered node */}
        {hoveredNode && (() => {
          const n = simNodes.find((s) => s.id === hoveredNode)
          if (!n) return null
          return (
            <g>
              <rect
                x={n.x - 60}
                y={n.y - nodeRadius(n.weight) - 28}
                width={120}
                height={22}
                rx={6}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={n.x}
                y={n.y - nodeRadius(n.weight) - 13}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="#374151"
              >
                {n.label} ({n.weight})
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        {[
          { type: 'person', label: 'People' },
          { type: 'department', label: 'Departments' },
          { type: 'topic', label: 'Topics' },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="size-3 rounded-full border"
              style={{
                backgroundColor: TYPE_BG[type],
                borderColor: TYPE_COLORS[type],
              }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
