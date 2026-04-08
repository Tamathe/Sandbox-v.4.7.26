'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { GraphNode, GraphEdge, BloomLevel } from '../../lib/curriculum-intel/types'
import { BLOOM_COLORS } from '../../lib/curriculum-intel/types'

const UK_BLUE = '#0033A0'

// ── Department color palette ────────────────────────────────────────────────

const DEPT_COLORS = [
  '#0033A0', '#7c3aed', '#059669', '#dc2626', '#d97706',
  '#2563eb', '#db2777', '#0891b2', '#65a30d', '#9333ea',
]

function getDeptColor(dept: string | null, departments: string[]): string {
  if (!dept) return '#6b7280'
  const idx = departments.indexOf(dept)
  return DEPT_COLORS[idx % DEPT_COLORS.length]
}

// ── Simple force simulation ─────────────────────────────────────────────────

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): SimNode[] {
  const simNodes: SimNode[] = nodes.map((n, i) => ({
    ...n,
    x: width / 2 + (Math.random() - 0.5) * width * 0.6,
    y: height / 2 + (Math.random() - 0.5) * height * 0.6,
    vx: 0,
    vy: 0,
  }))

  const nodeMap = new Map(simNodes.map(n => [n.id, n]))
  const iterations = 120
  const repulsion = 2000
  const attraction = 0.005
  const damping = 0.85
  const centerPull = 0.01

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all node pairs
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i]
        const b = simNodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.sourceId)
      const target = nodeMap.get(edge.targetId)
      if (!source || !target) continue
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const force = dist * attraction * edge.strength
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    // Center gravity
    for (const node of simNodes) {
      node.vx += (width / 2 - node.x) * centerPull
      node.vy += (height / 2 - node.y) * centerPull
    }

    // Apply velocity with damping
    for (const node of simNodes) {
      node.vx *= damping
      node.vy *= damping
      node.x += node.vx
      node.y += node.vy
      // Clamp to bounds
      node.x = Math.max(30, Math.min(width - 30, node.x))
      node.y = Math.max(30, Math.min(height - 30, node.y))
    }
  }

  return simNodes
}

// ── Component ───────────────────────────────────────────────────────────────

interface NetworkGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  departments: string[]
  onNodeClick?: (nodeId: string) => void
}

export default function NetworkGraph({ nodes, edges, departments, onNodeClick }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [zoom, setZoom] = useState(1)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [dimensions] = useState({ width: 900, height: 500 })

  useEffect(() => {
    if (nodes.length === 0) return
    const result = runForceSimulation(nodes, edges, dimensions.width, dimensions.height)
    setSimNodes(result)
  }, [nodes, edges, dimensions])

  const nodeMap = new Map(simNodes.map(n => [n.id, n]))

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.2, 3)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.2, 0.3)), [])
  const handleReset = useCallback(() => setZoom(1), [])

  const getNodeRadius = (node: GraphNode) => {
    return Math.max(4, Math.min(12, 4 + node.courseCount * 2))
  }

  const getEdgeColor = (edge: GraphEdge) => {
    if (edge.strength >= 0.8) return '#22c55e'
    if (edge.strength <= 0.3) return '#ef4444'
    return '#d1d5db'
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No curriculum graph data yet. Run a refresh to build the graph.
      </div>
    )
  }

  return (
    <div className="relative border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button onClick={handleZoomIn} className="p-1.5 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
          <ZoomIn className="size-4 text-gray-600" />
        </button>
        <button onClick={handleZoomOut} className="p-1.5 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
          <ZoomOut className="size-4 text-gray-600" />
        </button>
        <button onClick={handleReset} className="p-1.5 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
          <Maximize2 className="size-4 text-gray-600" />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full"
        style={{ height: 500 }}
      >
        <g transform={`scale(${zoom})`}>
          {/* Edges */}
          {edges.map(edge => {
            const source = nodeMap.get(edge.sourceId)
            const target = nodeMap.get(edge.targetId)
            if (!source || !target) return null
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={getEdgeColor(edge)}
                strokeWidth={Math.max(0.5, edge.strength * 2)}
                strokeOpacity={0.6}
              />
            )
          })}

          {/* Nodes */}
          {simNodes.map(node => {
            const r = getNodeRadius(node)
            const isHovered = hoveredNode === node.id
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onNodeClick?.(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <circle
                  r={isHovered ? r + 2 : r}
                  fill={getDeptColor(node.department, departments)}
                  fillOpacity={node.avgMastery != null ? 0.4 + node.avgMastery * 0.6 : 0.7}
                  stroke={node.bloomLevel ? BLOOM_COLORS[node.bloomLevel] : '#9ca3af'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
                {isHovered && (
                  <text
                    y={-r - 5}
                    textAnchor="middle"
                    className="text-[10px] fill-gray-800 font-medium"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.label.length > 30 ? node.label.slice(0, 30) + '...' : node.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2 border-t text-xs text-gray-500">
        <span>
          <strong>Color:</strong> department
        </span>
        <span>
          <strong>Size:</strong> course count
        </span>
        <span>
          <strong>Border:</strong> Bloom level
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-green-500" /> Strong edges
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-red-500" /> Weak/gap edges
        </span>
        <span>
          Nodes: {nodes.length} | Edges: {edges.length}
        </span>
      </div>
    </div>
  )
}
