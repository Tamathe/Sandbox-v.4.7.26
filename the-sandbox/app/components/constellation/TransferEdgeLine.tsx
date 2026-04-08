'use client'

import type { TransferEdge } from '../../lib/constellation-service'

interface TransferEdgeLineProps {
  edge: TransferEdge
  sourcePos: { x: number; y: number }
  targetPos: { x: number; y: number }
}

export default function TransferEdgeLine({
  edge,
  sourcePos,
  targetPos,
}: TransferEdgeLineProps) {
  const mx = (sourcePos.x + targetPos.x) / 2
  const my = (sourcePos.y + targetPos.y) / 2

  // Control point perpendicular to midpoint
  const dx = targetPos.x - sourcePos.x
  const dy = targetPos.y - sourcePos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const offset = Math.max(30, dist * 0.2)
  // Perpendicular direction
  const nx = dist > 0 ? -dy / dist : 0
  const ny = dist > 0 ? dx / dist : 1
  const cx = mx + nx * offset
  const cy = my + ny * offset

  const pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${cx} ${cy} ${targetPos.x} ${targetPos.y}`

  // Label position at Bézier midpoint (t=0.5)
  const labelX = 0.25 * sourcePos.x + 0.5 * cx + 0.25 * targetPos.x
  const labelY = 0.25 * sourcePos.y + 0.5 * cy + 0.25 * targetPos.y

  return (
    <g>
      {/* Outer glow */}
      <path
        d={pathD}
        fill="none"
        stroke="#0033A0"
        strokeWidth={6}
        strokeOpacity={0.3}
        strokeDasharray="8 4"
        style={{
          animation: 'dashFlow 1.5s linear infinite',
        }}
      />
      {/* Inner solid */}
      <path
        d={pathD}
        fill="none"
        stroke="#0033A0"
        strokeWidth={2}
        strokeDasharray="8 4"
        style={{
          animation: 'dashFlow 1.5s linear infinite',
        }}
      />
      {/* Concept label at midpoint */}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dy={-6}
        fontSize={9}
        fill="#0033A0"
        fontWeight={600}
      >
        {edge.concept}
      </text>
    </g>
  )
}
