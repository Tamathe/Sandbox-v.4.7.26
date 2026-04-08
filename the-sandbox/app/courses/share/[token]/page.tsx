'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  FileText,
  Layers,
  GitFork,
  Lock,
  Loader2,
} from 'lucide-react'

// ── Types (mirror from course-map page) ──────────────────────────────────────

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

const EDGE_LABELS: Record<string, string> = {
  PREREQUISITE: 'Prerequisite',
  SEQUENCE: 'Sequence',
  CONCURRENT: 'Concurrent',
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SharedCourseMapPage() {
  return <Suspense fallback={null}><SharedCourseMapPageInner /></Suspense>
}

function SharedCourseMapPageInner() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const isEmbed = searchParams.get('embed') === 'true'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresCode, setRequiresCode] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [graphMap, setGraphMap] = useState<SharedGraphMap | null>(null)

  const loadMap = useCallback(async (code?: string) => {
    try {
      setLoading(true)
      setCodeError(false)

      const url = new URL(`/api/courses/_/course-map/public/${token}`, window.location.origin)
      if (code) url.searchParams.set('code', code)

      const res = await fetch(url.toString())

      if (res.status === 403) {
        const data = await res.json()
        if (data.requiresCode) {
          setRequiresCode(true)
          if (code) setCodeError(true)
          setLoading(false)
          return
        }
      }

      if (!res.ok) {
        throw new Error('Course map not found or link has been revoked')
      }

      const data = await res.json() as SharedGraphMap
      setGraphMap(data)
      setRequiresCode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadMap()
  }, [loadMap])

  const handleCodeSubmit = () => {
    if (accessCode.trim()) loadMap(accessCode.trim())
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Access code prompt ───────────────────────────────────────────────────

  if (requiresCode && !graphMap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border-2 border-gray-200 bg-white px-8 py-10 text-center">
          <Lock className="mx-auto size-10 text-gray-300 mb-4" />
          <h1 className="text-lg font-extrabold text-gray-900">Access Code Required</h1>
          <p className="mt-2 text-sm text-gray-500">
            This course map is protected. Enter the access code to view it.
          </p>
          <div className="mt-6 space-y-3">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCodeSubmit() }}
              placeholder="Enter access code"
              className={`w-full border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0033A0] ${
                codeError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
            />
            {codeError && (
              <p className="text-xs text-red-600 flex items-center gap-1 justify-center">
                <AlertTriangle className="size-3" /> Invalid access code
              </p>
            )}
            <button
              onClick={handleCodeSubmit}
              disabled={!accessCode.trim()}
              className="w-full px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] transition-colors disabled:opacity-50"
            >
              View Course Map
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error || !graphMap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="rounded-2xl border-2 border-gray-200 bg-white px-8 py-10 text-center">
          <h1 className="text-lg font-extrabold text-gray-900">Course Map Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">{error || 'This link may have been revoked.'}</p>
        </div>
      </div>
    )
  }

  // ── Build node/unit lookups ──────────────────────────────────────────────

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

  // ── Render graph ─────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-gray-50 ${isEmbed ? '' : ''}`}>
      {/* Header — hidden in embed mode */}
      {!isEmbed && (
        <div className="border-b border-gray-200 bg-[#0033A0] px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Shared Course Map</p>
            <h1 className="mt-1 text-xl font-extrabold text-white">
              {graphMap.courseCode}: {graphMap.courseTitle}
            </h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-blue-100">
              <span className="flex items-center gap-1">
                <Layers className="size-3.5" /> {graphMap.nodes.length} nodes
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="size-3.5" /> {graphMap.edges.length} edges
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info strip */}
      {!isEmbed && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="font-semibold text-gray-700">Legend:</span>
            {Object.entries(EDGE_LABELS).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: EDGE_COLORS[type] }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Graph canvas */}
      <div className={`mx-auto ${isEmbed ? '' : 'max-w-6xl px-4 sm:px-6 lg:px-8 pb-8'}`}>
        <div className={`bg-white ${isEmbed ? '' : 'border-2 border-gray-200 rounded-2xl'} overflow-auto`}>
          <div className="relative" style={{ width: canvasWidth, height: canvasHeight, minWidth: '100%' }}>
            {/* SVG edges */}
            <svg className="absolute inset-0" style={{ overflow: 'visible', pointerEvents: 'none' }}>
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
              {graphMap.edges.map((edge) => {
                const from = nodeMap.get(edge.fromNodeId)
                const to = nodeMap.get(edge.toNodeId)
                if (!from || !to) return null
                const d = computeEdgePath(from, to)
                const color = EDGE_COLORS[edge.edgeType] || '#6b7280'
                return (
                  <path
                    key={edge.id}
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    markerEnd={`url(#arrow-${edge.edgeType})`}
                    opacity={0.7}
                  />
                )
              })}
            </svg>

            {/* Node cards */}
            {graphMap.nodes.map((node) => {
              const unit = node.courseUnitId ? unitMap.get(node.courseUnitId) : null
              return (
                <div
                  key={node.id}
                  style={{ position: 'absolute', left: node.xPos, top: node.yPos, width: NODE_WIDTH }}
                >
                  <div
                    className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-left select-none"
                    style={{ minHeight: NODE_HEIGHT }}
                  >
                    <span className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
                      {node.label}
                    </span>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {unit && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${UNIT_TYPE_COLORS[unit.unitType] || UNIT_TYPE_COLORS.OTHER}`}>
                          {unit.unitType}
                        </span>
                      )}
                    </div>
                    {unit && (unit.startDate || unit.endDate) && (
                      <div className="text-[10px] text-gray-400 mt-1 truncate flex items-center gap-1">
                        <Calendar className="size-2.5" />
                        {unit.startDate ? new Date(unit.startDate).toLocaleDateString() : '—'}
                        {' – '}
                        {unit.endDate ? new Date(unit.endDate).toLocaleDateString() : '—'}
                      </div>
                    )}
                    {unit && unit.modules.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <FileText className="size-2.5" />
                        {unit.modules.length} module{unit.modules.length !== 1 ? 's' : ''}
                        {' · '}
                        {unit.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer — hidden in embed mode */}
      {!isEmbed && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 text-center">
          <p className="text-xs text-gray-400">
            Shared by CATS-AI &middot; University of Kentucky
          </p>
        </div>
      )}
    </div>
  )
}
