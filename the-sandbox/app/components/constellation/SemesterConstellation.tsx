'use client'

import { useMemo } from 'react'
import { Stars } from 'lucide-react'
import type {
  SemesterConstellation as SemesterConstellationData,
  ConstellationNode as ConstellationNodeType,
} from '../../lib/constellation-service'
import ConstellationNodeComponent from './ConstellationNode'
import TransferEdgeLine from './TransferEdgeLine'

interface SemesterConstellationProps {
  data: SemesterConstellationData
  onNodeClick: (node: ConstellationNodeType) => void
}

// SVG viewBox dimensions
const VB_W = 800
const VB_H = 600
const CENTER_X = VB_W / 2
const CENTER_Y = VB_H / 2
const CLUSTER_RADIUS = 200

interface NodePosition {
  x: number
  y: number
}

export default function SemesterConstellation({
  data,
  onNodeClick,
}: SemesterConstellationProps) {
  // Precompute all positions
  const { nodePositionMap, clusterCenters } = useMemo(() => {
    const posMap = new Map<string, NodePosition>()
    const centers = new Map<string, NodePosition>()
    const courseCount = data.courses.length

    if (courseCount === 0) return { nodePositionMap: posMap, clusterCenters: centers }

    data.courses.forEach((cluster, idx) => {
      // Cluster center position
      let cx: number, cy: number
      if (courseCount === 1) {
        cx = CENTER_X
        cy = CENTER_Y
      } else {
        const angle = (idx * 2 * Math.PI) / courseCount - Math.PI / 2
        cx = CENTER_X + CLUSTER_RADIUS * Math.cos(angle)
        cy = CENTER_Y + CLUSTER_RADIUS * Math.sin(angle)
      }
      centers.set(cluster.courseId, { x: cx, y: cy })

      // Node positions around cluster center
      const nodeCount = cluster.nodes.length
      const orbitRadius = Math.max(40, Math.sqrt(nodeCount) * 20)

      cluster.nodes.forEach((node, nIdx) => {
        if (nodeCount === 1) {
          posMap.set(node.id, { x: cx + orbitRadius, y: cy })
        } else {
          const nAngle = (nIdx * 2 * Math.PI) / nodeCount - Math.PI / 2
          posMap.set(node.id, {
            x: cx + orbitRadius * Math.cos(nAngle),
            y: cy + orbitRadius * Math.sin(nAngle),
          })
        }
      })
    })

    return { nodePositionMap: posMap, clusterCenters: centers }
  }, [data])

  if (data.courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Stars className="size-12 mb-3" />
        <p className="text-sm font-medium">No courses found this semester</p>
        <p className="text-xs mt-1">
          Enroll in courses to see your knowledge constellation
        </p>
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      style={{ maxHeight: '70vh' }}
    >
      {/* CSS animation for flowing dashes */}
      <defs>
        <style>{`
          @keyframes dashFlow {
            to { stroke-dashoffset: -24; }
          }
        `}</style>
      </defs>

      {/* Transfer edges (behind everything) */}
      {data.transferEdges.map((edge, i) => {
        const sourcePos = clusterCenters.get(edge.sourceCourseId)
        const targetPos = clusterCenters.get(edge.targetCourseId)
        if (!sourcePos || !targetPos) return null
        return (
          <TransferEdgeLine
            key={`transfer-${i}`}
            edge={edge}
            sourcePos={sourcePos}
            targetPos={targetPos}
          />
        )
      })}

      {/* Intra-course edges */}
      {data.courses.map((cluster) =>
        cluster.edges.map((edge, i) => {
          const from = nodePositionMap.get(edge.fromNodeId)
          const to = nodePositionMap.get(edge.toNodeId)
          if (!from || !to) return null
          return (
            <line
              key={`intra-${cluster.courseId}-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#d1d5db"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          )
        }),
      )}

      {/* Cluster labels at centers */}
      {data.courses.map((cluster) => {
        const center = clusterCenters.get(cluster.courseId)
        if (!center) return null
        return (
          <text
            key={`label-${cluster.courseId}`}
            x={center.x}
            y={center.y}
            textAnchor="middle"
            dy={4}
            fontSize={11}
            fontWeight={700}
            fill={cluster.color}
          >
            {cluster.courseCode}
          </text>
        )
      })}

      {/* Nodes */}
      {data.courses.map((cluster) =>
        cluster.nodes.map((node) => {
          const pos = nodePositionMap.get(node.id)
          if (!pos) return null
          return (
            <ConstellationNodeComponent
              key={node.id}
              node={node}
              x={pos.x}
              y={pos.y}
              onClick={() => onNodeClick(node)}
            />
          )
        }),
      )}
    </svg>
  )
}
