'use client'

import { useEffect, useState, useMemo } from 'react'
import { GitBranch, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'

interface BridgeEdge {
  conceptA: string
  courseA: string
  conceptB: string
  courseB: string
  similarity: number
  bridgeType: string
}

interface GraphNode {
  id: string
  label: string
  courseId: string
  x: number
  y: number
}

interface GraphEdge {
  source: string
  target: string
  similarity: number
  bridgeType: string
}

// Deterministic hash for consistent node placement
function hashCode(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

// Assign colors by course
const COURSE_COLORS = [
  '#0033A0', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
]

function getCourseColor(courseId: string, courseIndex: Map<string, number>): string {
  if (!courseIndex.has(courseId)) {
    courseIndex.set(courseId, courseIndex.size)
  }
  return COURSE_COLORS[courseIndex.get(courseId)! % COURSE_COLORS.length]
}

export default function ConceptBridgeMap() {
  const { currentUser } = useAuth()
  const [bridges, setBridges] = useState<BridgeEdge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ bridges: BridgeEdge[] }>(
          currentUser.email,
          '/api/concept-bridge/map',
        )
        setBridges(data.bridges)
      } catch {
        // Silently fail — map is non-critical
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser.email])

  const { nodes, edges, courseIndex } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>()
    const edgeList: GraphEdge[] = []
    const ci = new Map<string, number>()
    const WIDTH = 800
    const HEIGHT = 500
    const PADDING = 60

    for (const b of bridges) {
      const idA = `${b.conceptA}::${b.courseA}`
      const idB = `${b.conceptB}::${b.courseB}`

      if (!nodeMap.has(idA)) {
        const h = hashCode(idA)
        nodeMap.set(idA, {
          id: idA,
          label: b.conceptA,
          courseId: b.courseA,
          x: PADDING + (h % (WIDTH - 2 * PADDING)),
          y: PADDING + ((h * 7) % (HEIGHT - 2 * PADDING)),
        })
      }
      if (!nodeMap.has(idB)) {
        const h = hashCode(idB)
        nodeMap.set(idB, {
          id: idB,
          label: b.conceptB,
          courseId: b.courseB,
          x: PADDING + (h % (WIDTH - 2 * PADDING)),
          y: PADDING + ((h * 7) % (HEIGHT - 2 * PADDING)),
        })
      }

      edgeList.push({
        source: idA,
        target: idB,
        similarity: b.similarity,
        bridgeType: b.bridgeType,
      })

      getCourseColor(b.courseA, ci)
      getCourseColor(b.courseB, ci)
    }

    return { nodes: Array.from(nodeMap.values()), edges: edgeList, courseIndex: ci }
  }, [bridges])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-16">
        <GitBranch className="size-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No concept bridges discovered yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Bridges are auto-discovered weekly across courses.
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-extrabold text-sm flex items-center gap-2">
          <GitBranch className="size-4 text-[#0033A0]" />
          Concept Bridge Map
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {nodes.length} concepts connected across {courseIndex.size} courses
        </p>
      </div>

      <svg viewBox="0 0 800 500" className="w-full h-auto" role="img" aria-label="Concept bridge graph visualization">
        {/* Edges */}
        {edges.map((edge, i) => {
          const source = nodes.find(n => n.id === edge.source)
          const target = nodes.find(n => n.id === edge.target)
          if (!source || !target) return null
          const opacity = 0.2 + edge.similarity * 0.6
          const width = 1 + edge.similarity * 2

          return (
            <line
              key={`edge-${i}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#94A3B8"
              strokeWidth={width}
              strokeOpacity={opacity}
              strokeDasharray={edge.bridgeType === 'identical' ? undefined : '4 2'}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const color = getCourseColor(node.courseId, courseIndex)
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={8}
                fill={color}
                fillOpacity={0.9}
                stroke="white"
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y - 12}
                textAnchor="middle"
                className="text-[10px] fill-gray-600"
              >
                {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="p-3 border-t bg-gray-50 flex flex-wrap gap-3">
        {Array.from(courseIndex.entries()).map(([courseId, idx]) => (
          <div key={courseId} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }}
            />
            {courseId}
          </div>
        ))}
      </div>
    </div>
  )
}
