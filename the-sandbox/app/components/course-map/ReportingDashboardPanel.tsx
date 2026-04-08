'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  X,
  FileBarChart,
  TrendingUp,
  LayoutGrid,
  GitFork,
  FileText,
  Loader2,
  Printer,
  AlertTriangle,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import {
  getCompletionProjections,
  getProgressHeatmap,
  getPrerequisiteChainAnalysis,
  generatePrintableSummary,
  type CompletionProjection,
  type HeatmapCell,
  type ChainAnalysis,
  type PrintableSummary,
  type ProgressEntry,
} from '../../lib/course-map/reporting-service'

// ── Props ────────────────────────────────────────────────────────────────────

interface GraphMap {
  id: string
  courseCode?: string
  courseTitle?: string
  nodes: { id: string; label: string; nodeType: string; courseUnitId: string | null }[]
  edges: { fromNodeId: string; toNodeId: string; edgeType: string }[]
  units: {
    id: string
    label: string
    description: string | null
    modules: { label: string; description?: string | null; lessons: { label: string }[] }[]
  }[]
}

interface ReportingDashboardPanelProps {
  graphMap: GraphMap
  userEmail: string
  onClose: () => void
  onSelectNode?: (nodeId: string) => void
}

type ReportTab = 'projections' | 'heatmap' | 'prerequisites' | 'summary'

// ── Helpers ─────────────────────────────────────────────────────────────────

const ENGAGEMENT_COLORS = [
  'bg-gray-100 text-gray-400',   // 0 = none
  'bg-red-100 text-red-700',     // 1 = low
  'bg-amber-100 text-amber-700', // 2 = medium
  'bg-green-100 text-green-700', // 3 = high
  'bg-blue-100 text-blue-700',   // 4 = complete
]

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-700',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ReportingDashboardPanel({
  graphMap,
  userEmail,
  onClose,
  onSelectNode,
}: ReportingDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('projections')
  const [loading, setLoading] = useState(false)

  // Projections state
  const [projections, setProjections] = useState<CompletionProjection[]>([])

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([])

  // Prerequisites state
  const [chainAnalysis, setChainAnalysis] = useState<ChainAnalysis | null>(null)

  // Summary state
  const [summary, setSummary] = useState<PrintableSummary | null>(null)

  // Fetch student progress (demo: generate sample data based on graph)
  const fetchProgressData = useCallback(async (): Promise<ProgressEntry[]> => {
    try {
      const res = await fetch(`/api/course-map/${graphMap.id}/progress`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) return res.json()
    } catch {
      // fallback to generated data
    }

    // Generate demo progress entries
    const now = Date.now()
    return graphMap.nodes.map((node, i) => {
      const completed = i < Math.floor(graphMap.nodes.length * 0.3)
      return {
        nodeId: node.id,
        completed,
        completedAt: completed ? new Date(now - (graphMap.nodes.length - i) * 86400000).toISOString() : null,
        startedAt: i < Math.floor(graphMap.nodes.length * 0.5)
          ? new Date(now - (graphMap.nodes.length - i + 2) * 86400000).toISOString()
          : null,
        score: completed ? Math.round(70 + Math.random() * 30) : null,
      }
    })
  }, [graphMap, userEmail])

  // Load data when tab changes
  useEffect(() => {
    let cancelled = false

    async function loadTab() {
      setLoading(true)
      try {
        if (activeTab === 'projections' && projections.length === 0) {
          const progress = await fetchProgressData()
          if (!cancelled) {
            setProjections(getCompletionProjections(graphMap.nodes, progress))
          }
        } else if (activeTab === 'heatmap' && heatmapData.length === 0) {
          const progress = await fetchProgressData()
          if (!cancelled) {
            setHeatmapData(getProgressHeatmap(graphMap.nodes, graphMap.units, progress))
          }
        } else if (activeTab === 'prerequisites' && !chainAnalysis) {
          if (!cancelled) {
            setChainAnalysis(getPrerequisiteChainAnalysis(graphMap.nodes, graphMap.edges))
          }
        } else if (activeTab === 'summary' && !summary) {
          const progress = await fetchProgressData()
          const chain = chainAnalysis || getPrerequisiteChainAnalysis(graphMap.nodes, graphMap.edges)
          const proj = projections.length > 0 ? projections : getCompletionProjections(graphMap.nodes, progress)
          if (!cancelled) {
            if (!chainAnalysis) setChainAnalysis(chain)
            if (projections.length === 0) setProjections(proj)
            setSummary(generatePrintableSummary(graphMap, chain, proj))
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTab()
    return () => { cancelled = true }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { key: ReportTab; label: string; icon: typeof TrendingUp }[] = [
    { key: 'projections', label: 'Projections', icon: TrendingUp },
    { key: 'heatmap', label: 'Heatmap', icon: LayoutGrid },
    { key: 'prerequisites', label: 'Prerequisites', icon: GitFork },
    { key: 'summary', label: 'Summary', icon: FileText },
  ]

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l-2 border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileBarChart className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Reports</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
          <X className="size-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-[#0033A0] text-[#0033A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="size-8 animate-spin mb-3" />
            <p className="text-sm">Loading report data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'projections' && <ProjectionsView projections={projections} onSelectNode={onSelectNode} />}
            {activeTab === 'heatmap' && <HeatmapView data={heatmapData} onSelectNode={onSelectNode} />}
            {activeTab === 'prerequisites' && <PrerequisitesView analysis={chainAnalysis} onSelectNode={onSelectNode} />}
            {activeTab === 'summary' && <SummaryView summary={summary} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── Projections Tab ─────────────────────────────────────────────────────────

function ProjectionsView({ projections, onSelectNode }: { projections: CompletionProjection[]; onSelectNode?: (id: string) => void }) {
  if (projections.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No projection data available.</p>
  }

  const completed = projections.filter((p) => p.daysRemaining === 0)
  const remaining = projections.filter((p) => p.daysRemaining > 0)

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-extrabold text-green-600">{completed.length}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-extrabold text-amber-600">{remaining.length}</p>
          <p className="text-xs text-gray-500">Remaining</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-extrabold text-[#0033A0]">
            {remaining.length > 0 ? Math.max(...remaining.map((p) => p.daysRemaining)) : 0}d
          </p>
          <p className="text-xs text-gray-500">Est. Total</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">Estimated Timeline</h3>
        {remaining.slice(0, 15).map((p) => (
          <button
            key={p.nodeId}
            onClick={() => onSelectNode?.(p.nodeId)}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{p.nodeLabel}</p>
              <p className="text-xs text-gray-500">
                ~{p.daysRemaining} days &middot; {new Date(p.estimatedCompletionDate).toLocaleDateString()}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONFIDENCE_STYLES[p.confidence]}`}>
              {p.confidence}
            </span>
            {/* Simple bar */}
            <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0033A0]"
                style={{ width: `${p.percentComplete}%` }}
              />
            </div>
          </button>
        ))}
        {remaining.length > 15 && (
          <p className="text-xs text-gray-400 text-center">+{remaining.length - 15} more nodes</p>
        )}
      </div>
    </div>
  )
}

// ── Heatmap Tab ─────────────────────────────────────────────────────────────

function HeatmapView({ data, onSelectNode }: { data: HeatmapCell[]; onSelectNode?: (id: string) => void }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No heatmap data available.</p>
  }

  // Group by unit
  const byUnit = new Map<string, HeatmapCell[]>()
  for (const cell of data) {
    const existing = byUnit.get(cell.unitLabel) || []
    existing.push(cell)
    byUnit.set(cell.unitLabel, existing)
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Engagement:</span>
        {['None', 'Low', 'Med', 'High', 'Done'].map((label, i) => (
          <span key={label} className={`rounded px-1.5 py-0.5 ${ENGAGEMENT_COLORS[i]}`}>{label}</span>
        ))}
      </div>

      {Array.from(byUnit.entries()).map(([unitLabel, cells]) => (
        <div key={unitLabel} className="space-y-1.5">
          <h3 className="text-sm font-bold text-gray-700">{unitLabel}</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {cells.map((cell) => (
              <button
                key={cell.nodeId}
                onClick={() => onSelectNode?.(cell.nodeId)}
                className={`rounded-lg p-2 text-left transition-colors hover:ring-2 hover:ring-[#0033A0] ${ENGAGEMENT_COLORS[cell.engagementLevel]}`}
                title={`${cell.nodeLabel}: ${cell.completionRate}% complete${cell.averageScore != null ? `, avg score: ${Math.round(cell.averageScore)}` : ''}`}
              >
                <p className="text-xs font-semibold truncate">{cell.nodeLabel}</p>
                <p className="text-[10px] opacity-75">{cell.completionRate}%</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Prerequisites Tab ───────────────────────────────────────────────────────

function PrerequisitesView({ analysis, onSelectNode }: { analysis: ChainAnalysis | null; onSelectNode?: (id: string) => void }) {
  if (!analysis) {
    return <p className="text-sm text-gray-400 text-center py-8">No prerequisite data available.</p>
  }

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-extrabold text-[#0033A0]">{analysis.stats.prereqEdges}</p>
          <p className="text-xs text-gray-500">Prereq Links</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-extrabold text-amber-600">{analysis.criticalPathLength}</p>
          <p className="text-xs text-gray-500">Critical Path</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-2xl font-extrabold text-gray-600">{analysis.stats.isolatedNodes}</p>
          <p className="text-xs text-gray-500">Isolated</p>
        </div>
      </div>

      {/* Critical path */}
      {analysis.criticalPath.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700">Critical Path</h3>
          <div className="flex flex-wrap items-center gap-1">
            {analysis.criticalPath.map((node, i) => (
              <div key={node.nodeId} className="flex items-center gap-1">
                <button
                  onClick={() => onSelectNode?.(node.nodeId)}
                  className="rounded-lg border border-[#0033A0] bg-blue-50 px-2 py-1 text-xs font-semibold text-[#0033A0] hover:bg-blue-100 transition-colors"
                >
                  {node.nodeLabel}
                </button>
                {i < analysis.criticalPath.length - 1 && <ChevronRight className="size-3 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottleneck nodes */}
      {analysis.bottleneckNodes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-amber-500" />
            Bottleneck Nodes
          </h3>
          {analysis.bottleneckNodes.slice(0, 8).map((node) => (
            <button
              key={node.nodeId}
              onClick={() => onSelectNode?.(node.nodeId)}
              className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-left hover:bg-amber-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{node.nodeLabel}</p>
                <p className="text-xs text-gray-500">
                  {node.inDegree} incoming &middot; {node.outDegree} outgoing
                </p>
              </div>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                {node.dependentCount} deps
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Longest chains */}
      {analysis.longestChains.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <BarChart3 className="size-4 text-[#0033A0]" />
            Chain Length Stats
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Average chain length: <span className="font-semibold">{analysis.stats.avgChainLength}</span></p>
            <p>Max chain length: <span className="font-semibold">{analysis.stats.maxChainLength}</span></p>
            <p>Total nodes: <span className="font-semibold">{analysis.stats.totalNodes}</span></p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Summary Tab ─────────────────────────────────────────────────────────────

function SummaryView({ summary }: { summary: PrintableSummary | null }) {
  if (!summary) {
    return <p className="text-sm text-gray-400 text-center py-8">No summary data available.</p>
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">Course Report</h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Printer className="size-4" />
          Print
        </button>
      </div>

      {/* Course info */}
      <div className="rounded-2xl border-2 border-gray-200 p-4 space-y-2">
        <h4 className="text-lg font-extrabold text-gray-900">{summary.courseTitle}</h4>
        <p className="text-sm text-gray-500">{summary.courseCode} &middot; Generated {new Date(summary.generatedAt).toLocaleDateString()}</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Units</p>
          <p className="text-xl font-extrabold text-gray-900">{summary.overview.totalUnits}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Modules</p>
          <p className="text-xl font-extrabold text-gray-900">{summary.overview.totalModules}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Lessons</p>
          <p className="text-xl font-extrabold text-gray-900">{summary.overview.totalLessons}</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Connections</p>
          <p className="text-xl font-extrabold text-gray-900">{summary.overview.totalEdges}</p>
        </div>
      </div>

      {/* Prerequisites overview */}
      <div className="rounded-xl border border-gray-200 p-3 space-y-1">
        <h4 className="text-sm font-bold text-gray-700">Prerequisites</h4>
        <p className="text-sm text-gray-600">Critical path length: <span className="font-semibold">{summary.prerequisites.criticalPathLength}</span></p>
        <p className="text-sm text-gray-600">Bottleneck nodes: <span className="font-semibold">{summary.prerequisites.bottleneckCount}</span></p>
        <p className="text-sm text-gray-600">Isolated nodes: <span className="font-semibold">{summary.prerequisites.isolatedNodeCount}</span></p>
      </div>

      {/* Projections */}
      {summary.projections && (
        <div className="rounded-xl border border-gray-200 p-3 space-y-1">
          <h4 className="text-sm font-bold text-gray-700">Completion Projections</h4>
          <p className="text-sm text-gray-600">
            Est. completion: <span className="font-semibold">{new Date(summary.projections.estimatedCompletionDate).toLocaleDateString()}</span>
          </p>
          <p className="text-sm text-gray-600">Confidence: <span className="font-semibold">{summary.projections.averageConfidence}</span></p>
          <p className="text-sm text-gray-600">Completed: <span className="font-semibold">{summary.projections.completedCount}</span> / Remaining: <span className="font-semibold">{summary.projections.remainingCount}</span></p>
        </div>
      )}

      {/* Unit breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-700">Unit Breakdown</h4>
        {summary.units.map((unit) => (
          <div key={unit.label} className="rounded-xl border border-gray-100 p-3">
            <p className="text-sm font-semibold text-gray-900">{unit.label}</p>
            {unit.description && <p className="text-xs text-gray-500 mt-0.5">{unit.description}</p>}
            <p className="text-xs text-gray-400 mt-1">
              {unit.moduleCount} modules &middot; {unit.lessonCount} lessons
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
