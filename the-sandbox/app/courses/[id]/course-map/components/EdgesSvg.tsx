'use client'

import { useState } from 'react'
import { EDGE_COLORS, EDGE_LABELS, NODE_WIDTH, NODE_HEIGHT } from './types'
import type { MapEdge, MapNode } from './types'
import type { EdgeRoutingMode } from '../../../../lib/course-map/visualization-service'
import { VisualizationService } from '../../../../lib/course-map/visualization-service'

export function computeEdgePath(from: MapNode, to: MapNode, routingMode: EdgeRoutingMode = 'bezier') {
  return VisualizationService.routeEdge(from, to, NODE_WIDTH, NODE_HEIGHT, routingMode)
}

export default function EdgesSvg({
  edges,
  nodeMap,
  isEditor,
  onDeleteEdge,
  connectingFrom,
  cursorPos,
  routingMode = 'bezier',
}: {
  edges: MapEdge[]
  nodeMap: Map<string, MapNode>
  isEditor: boolean
  onDeleteEdge?: (edgeId: string) => void
  connectingFrom?: MapNode | null
  cursorPos?: { x: number; y: number } | null
  routingMode?: EdgeRoutingMode
}) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  return (
    <svg className="absolute inset-0" role="img" aria-label="Course map connections diagram" style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* Existing edges */}
      {edges.map((edge) => {
        const from = nodeMap.get(edge.fromNodeId)
        const to = nodeMap.get(edge.toNodeId)
        if (!from || !to) return null

        const d = computeEdgePath(from, to, routingMode)
        const color = EDGE_COLORS[edge.edgeType] || '#6b7280'
        const isHovered = hoveredEdge === edge.id
        const edgeLabel = `${EDGE_LABELS[edge.edgeType] || edge.edgeType} connection from ${from.label} to ${to.label}`

        return (
          <g key={edge.id}>
            <title>{edgeLabel}</title>
            {/* Invisible wide hit area for hover/click */}
            {isEditor && (
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteEdge?.(edge.id)
                }}
              />
            )}
            <path
              d={d}
              fill="none"
              stroke={isHovered ? '#ef4444' : color}
              strokeWidth={isHovered ? 3 : 2}
              markerEnd={isHovered ? undefined : `url(#arrow-${edge.edgeType})`}
              opacity={isHovered ? 1 : 0.7}
              style={{ pointerEvents: 'none' }}
            />
            {/* Delete icon on hover */}
            {isHovered && isEditor && (() => {
              const midX = (from.xPos + NODE_WIDTH / 2 + to.xPos + NODE_WIDTH / 2) / 2
              const midY = (from.yPos + NODE_HEIGHT + to.yPos) / 2
              return (
                <g
                  transform={`translate(${midX - 10}, ${midY - 10})`}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  role="button"
                  aria-label={`Delete connection from ${from.label} to ${to.label}`}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteEdge?.(edge.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      e.preventDefault()
                      onDeleteEdge?.(edge.id)
                    }
                  }}
                >
                  <circle cx={10} cy={10} r={10} fill="white" stroke="#ef4444" strokeWidth={1.5} />
                  <line x1={6} y1={6} x2={14} y2={14} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                  <line x1={14} y1={6} x2={6} y2={14} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
                </g>
              )
            })()}
          </g>
        )
      })}

      {/* Dashed line from connecting source to cursor */}
      {connectingFrom && cursorPos && (
        <line
          x1={connectingFrom.xPos + NODE_WIDTH / 2}
          y1={connectingFrom.yPos + NODE_HEIGHT / 2}
          x2={cursorPos.x}
          y2={cursorPos.y}
          stroke="#0033A0"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.6}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  )
}
