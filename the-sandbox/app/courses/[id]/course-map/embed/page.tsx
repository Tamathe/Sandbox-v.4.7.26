'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, Layers, GitFork } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface SharedNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
}

interface SharedEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface SharedUnit {
  id: string
  label: string
  description: string | null
  unitType: string
  startDate: string | null
  endDate: string | null
  position: number
  modules: Array<{
    id: string
    label: string
    description: string | null
    lessons: Array<{
      id: string
      label: string
      dueDate: string | null
    }>
  }>
}

interface SharedGraphMap {
  courseCode: string
  courseTitle: string
  courseMapId: string
  nodes: SharedNode[]
  edges: SharedEdge[]
  units: SharedUnit[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_WIDTH = 240
const NODE_HEIGHT = 80

const EDGE_COLORS: Record<string, string> = {
  PREREQUISITE: '#dc2626',
  SEQUENCE: '#2563eb',
  CONCURRENT: '#9333ea',
}

const UNIT_TYPE_COLORS: Record<string, string> = {
  LECTURE: 'bg-blue-100 text-blue-700',
  LAB: 'bg-green-100 text-green-700',
  EXAM: 'bg-red-100 text-red-700',
  QUIZ: 'bg-amber-100 text-amber-700',
  ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
  DISCUSSION: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

function computeEdgePath(from: SharedNode, to: SharedNode) {
  const x1 = from.xPos + NODE_WIDTH / 2
  const y1 = from.yPos + NODE_HEIGHT
  const x2 = to.xPos + NODE_WIDTH / 2
  const y2 = to.yPos
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

// ── Embed Page ───────────────────────────────────────────────────────────────

export default function CourseMapEmbedPage() {
  return <Suspense fallback={null}><CourseMapEmbedPageInner /></Suspense>
}

function CourseMapEmbedPageInner() {
  const { id: courseId } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [graphMap, setGraphMap] = useState<SharedGraphMap | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // ── Load graph data ────────────────────────────────────────────────────

  const loadMap = useCallback(async () => {
    if (!token) {
      setError('No share token provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const url = `/api/courses/${courseId}/course-map/public/${token}`
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error('Course map not found or link has been revoked')
      }

      const data = (await res.json()) as SharedGraphMap
      setGraphMap(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [courseId, token])

  useEffect(() => {
    loadMap()
  }, [loadMap])

  // ── SSE for real-time updates ──────────────────────────────────────────

  useEffect(() => {
    if (!graphMap?.courseMapId) return

    // Poll for updated data every 30s (SSE edits/stream requires auth, so we poll instead)
    const pollInterval = setInterval(() => {
      if (token) {
        fetch(`/api/courses/${courseId}/course-map/public/${token}`)
          .then((res) => {
            if (res.ok) return res.json()
            return null
          })
          .then((data) => {
            if (data) setGraphMap(data as SharedGraphMap)
          })
          .catch(() => {
            // Silently ignore poll errors
          })
      }
    }, 30_000)

    return () => {
      clearInterval(pollInterval)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [graphMap?.courseMapId, courseId, token])

  // ── Loading skeleton ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-white" style={{ minHeight: '100%', height: '100vh' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-gray-300" />
          <p className="text-xs text-gray-400">Loading course map...</p>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (error || !graphMap) {
    return (
      <div className="flex items-center justify-center bg-white" style={{ minHeight: '100%', height: '100vh' }}>
        <div className="text-center px-4">
          <p className="text-sm font-semibold text-gray-900">Course Map Unavailable</p>
          <p className="mt-1 text-xs text-gray-500">{error || 'This link may have been revoked.'}</p>
        </div>
      </div>
    )
  }

  // ── Build lookups ──────────────────────────────────────────────────────

  const nodeMap = new Map<string, SharedNode>()
  const unitMap = new Map<string, SharedUnit>()
  for (const n of graphMap.nodes) nodeMap.set(n.id, n)
  for (const u of graphMap.units) unitMap.set(u.id, u)

  const activeNodes = graphMap.nodes.filter((n) => n.xPos !== 0 || n.yPos !== 0)
  let canvasWidth = 800
  let canvasHeight = 600
  if (activeNodes.length > 0) {
    const maxX = Math.max(...activeNodes.map((n) => n.xPos))
    const maxY = Math.max(...activeNodes.map((n) => n.yPos))
    canvasWidth = Math.max(800, maxX + NODE_WIDTH + 80)
    canvasHeight = Math.max(600, maxY + NODE_HEIGHT + 80)
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="bg-white" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Compact header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-gray-900 truncate">
            {graphMap.courseCode}: {graphMap.courseTitle}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 shrink-0">
          <span className="flex items-center gap-0.5">
            <Layers className="size-3" /> {graphMap.nodes.length}
          </span>
          <span className="flex items-center gap-0.5">
            <GitFork className="size-3" /> {graphMap.edges.length}
          </span>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="overflow-auto" style={{ height: 'calc(100vh - 33px)' }}>
        <div className="relative" style={{ width: canvasWidth, height: canvasHeight, minWidth: '100%' }}>
          {/* SVG edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
          >
            <defs>
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <marker
                  key={type}
                  id={`embed-arrow-${type}`}
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              ))}
            </defs>
            {graphMap.edges.map((edge) => {
              const from = nodeMap.get(edge.fromNodeId)
              const to = nodeMap.get(edge.toNodeId)
              if (!from || !to) return null
              const color = EDGE_COLORS[edge.edgeType] || '#6b7280'
              return (
                <path
                  key={edge.id}
                  d={computeEdgePath(from, to)}
                  stroke={color}
                  strokeWidth={2}
                  fill="none"
                  markerEnd={`url(#embed-arrow-${edge.edgeType})`}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {graphMap.nodes.map((node) => {
            const unit = node.courseUnitId ? unitMap.get(node.courseUnitId) : null
            const typeClass = UNIT_TYPE_COLORS[unit?.unitType || 'OTHER'] || UNIT_TYPE_COLORS.OTHER
            return (
              <div
                key={node.id}
                className="absolute bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden"
                style={{
                  left: node.xPos,
                  top: node.yPos,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
              >
                <div className="px-3 py-2 h-full flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {unit && (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${typeClass}`}>
                        {unit.unitType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
                    {node.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
