'use client'

import type { ConstellationNode as ConstellationNodeType } from '../../lib/constellation-service'

interface ConstellationNodeProps {
  node: ConstellationNodeType
  x: number
  y: number
  onClick: () => void
}

function getMastery(node: ConstellationNodeType): number {
  return node.masteryLevel ?? node.effectiveMastery ?? node.lastScore ?? 0
}

function getFillColor(mastery: number, node: ConstellationNodeType): string {
  if (
    node.status === 'not_started' &&
    mastery === 0 &&
    node.type === 'objective'
  )
    return '#d1d5db'
  if (mastery > 0.75) return '#22c55e'
  if (mastery >= 0.4) return '#f59e0b'
  if (mastery > 0) return '#ef4444'
  return '#d1d5db'
}

function buildTooltip(node: ConstellationNodeType, mastery: number): string {
  const lines: string[] = [node.label]
  if (mastery > 0) lines.push(`Mastery: ${Math.round(mastery * 100)}%`)
  if (node.type === 'objective' && node.bloomLevel)
    lines.push(`Bloom: ${node.bloomLevel}`)
  if (node.type === 'assignment' && node.dueAt)
    lines.push(`Due: ${new Date(node.dueAt).toLocaleDateString()}`)
  if (node.type === 'concept') {
    if (node.srOverdue) lines.push('SR: Overdue')
    else if (node.srDueDate)
      lines.push(`SR due: ${new Date(node.srDueDate).toLocaleDateString()}`)
    if (node.isStale) lines.push('Knowledge is stale')
  }
  return lines.join('\n')
}

// Hexagon points centered at (0,0) with given radius
function hexagonPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${r * Math.cos(angle)},${r * Math.sin(angle)}`
  }).join(' ')
}

// Diamond points centered at (0,0) with given radius
function diamondPoints(r: number): string {
  return `0,${-r} ${r},0 0,${r} ${-r},0`
}

export default function ConstellationNode({
  node,
  x,
  y,
  onClick,
}: ConstellationNodeProps) {
  const mastery = getMastery(node)
  const radius = 8 + mastery * 8
  const fill = getFillColor(mastery, node)
  const tooltip = buildTooltip(node, mastery)

  const pulseClass = node.isStale ? 'animate-pulse' : ''

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      className={pulseClass}
    >
      <title>{tooltip}</title>

      {/* SR overdue dashed ring */}
      {node.srOverdue && (
        <>
          {node.type === 'concept' ? (
            <polygon
              points={hexagonPoints(radius + 2)}
              fill="none"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          ) : (
            <circle
              r={radius + 2}
              fill="none"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
        </>
      )}

      {/* Node shape by type */}
      {node.type === 'objective' && (
        <circle r={radius} fill={fill} stroke="#fff" strokeWidth={1} />
      )}
      {node.type === 'assignment' && (
        <polygon
          points={diamondPoints(radius)}
          fill={fill}
          stroke="#fff"
          strokeWidth={1}
        />
      )}
      {node.type === 'concept' && (
        <polygon
          points={hexagonPoints(radius)}
          fill={fill}
          stroke="#fff"
          strokeWidth={1}
        />
      )}
      {node.type === 'tool' && (
        <rect
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          rx={3}
          ry={3}
          fill={fill}
          stroke="#fff"
          strokeWidth={1}
        />
      )}
    </g>
  )
}
