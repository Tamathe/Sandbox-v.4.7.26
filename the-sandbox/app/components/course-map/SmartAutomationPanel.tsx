'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  X,
  Zap,
  GitFork,
  Calendar,
  BarChart3,
  Heart,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  RefreshCw,
  Plus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from '../DynamicChart'
import {
  SmartAutomationEngine,
  type PrerequisiteSuggestion,
  type ScheduleConflict,
  type WorkloadAnalysis,
  type HealthReport,
  type FixSuggestion,
  type FixAction,
} from '../../lib/course-map/smart-automation-service'

// ── Types ───────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
  archived: boolean
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
}

interface CourseUnit {
  id: string
  label: string
  position: number
  startDate: string | null
  endDate: string | null
}

interface SmartAutomationPanelProps {
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
  onClose: () => void
  onApplyFix: (action: FixAction) => void
  onSelectNode?: (nodeId: string) => void
}

type SectionId = 'prerequisites' | 'schedule' | 'workload' | 'health'

// ── Component ───────────────────────────────────────────────────────────────

export default function SmartAutomationPanel({
  nodes,
  edges,
  units,
  onClose,
  onApplyFix,
  onSelectNode,
}: SmartAutomationPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('health')
  const [prereqs, setPrereqs] = useState<PrerequisiteSuggestion[]>([])
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [workload, setWorkload] = useState<WorkloadAnalysis | null>(null)
  const [health, setHealth] = useState<HealthReport | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const engineRef = useRef(new SmartAutomationEngine())
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const runAnalysis = useCallback(() => {
    setAnalyzing(true)

    // Run all analyses
    const engine = engineRef.current
    const detectedPrereqs = engine.detectPrerequisites(nodes, edges)
    const detectedConflicts = engine.findScheduleConflicts(nodes, units)
    const analyzedWorkload = engine.analyzeWorkload(nodes, units)
    const healthReport = engine.scoreMapHealth(nodes, edges, units)

    setPrereqs(detectedPrereqs)
    setConflicts(detectedConflicts)
    setWorkload(analyzedWorkload)
    setHealth(healthReport)
    setAnalyzing(false)
  }, [nodes, edges, units])

  // Run on mount
  useEffect(() => {
    runAnalysis()
  }, [runAnalysis])

  // Auto-run on map changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runAnalysis()
    }, 1500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [nodes.length, edges.length, runAnalysis])

  const sections: { id: SectionId; label: string; icon: typeof GitFork; count?: number }[] = [
    { id: 'health', label: 'Health', icon: Heart, count: health?.issues.length },
    { id: 'prerequisites', label: 'Prerequisites', icon: GitFork, count: prereqs.length },
    { id: 'schedule', label: 'Schedule', icon: Calendar, count: conflicts.length },
    { id: 'workload', label: 'Workload', icon: BarChart3, count: workload?.imbalances.length },
  ]

  const severityStyles = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle, iconColor: 'text-red-500' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle, iconColor: 'text-amber-500' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Info, iconColor: 'text-blue-500' },
  }

  const scoreColor = health
    ? health.score >= 80 ? '#16a34a' : health.score >= 60 ? '#d97706' : '#dc2626'
    : '#9ca3af'

  return (
    <div className="fixed right-4 top-20 z-50 flex w-[420px] flex-col rounded-2xl border-2 border-[#0033A0]/20 bg-white shadow-xl" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">Smart Automation</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-gray-200">
        {sections.map((sec) => {
          const Icon = sec.icon
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex flex-1 items-center justify-center gap-1 px-2 py-2 text-xs font-semibold transition-colors relative ${
                activeSection === sec.id
                  ? 'border-b-2 border-[#0033A0] text-[#0033A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="size-3.5" />
              {sec.label}
              {sec.count !== undefined && sec.count > 0 && (
                <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {sec.count > 9 ? '9+' : sec.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
        {/* ── Health Section ────────────────────────────────────────────── */}
        {activeSection === 'health' && (
          <div className="p-3 space-y-3">
            {health ? (
              <>
                {/* Score circle */}
                <div className="flex items-center gap-4 rounded-xl border-2 border-gray-100 bg-gray-50 p-4">
                  <div className="relative flex size-20 items-center justify-center">
                    <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeDasharray={`${(health.score / 100) * 213.6} 213.6`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold" style={{ color: scoreColor }}>{health.score}</span>
                      <span className="text-[10px] font-semibold text-gray-400">{health.grade}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">{health.summary}</p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {health.issues.filter((i) => i.severity === 'high').length} critical ·{' '}
                      {health.issues.filter((i) => i.severity === 'medium').length} moderate ·{' '}
                      {health.issues.filter((i) => i.severity === 'low').length} minor
                    </p>
                  </div>
                </div>

                {/* Issues list */}
                <div className="space-y-2">
                  {health.issues.map((issue) => {
                    const style = severityStyles[issue.severity]
                    const SevIcon = style.icon
                    return (
                      <div key={issue.id} className={`rounded-xl border ${style.border} ${style.bg} p-2.5`}>
                        <div className="flex items-start gap-2">
                          <SevIcon className={`mt-0.5 size-3.5 shrink-0 ${style.iconColor}`} />
                          <div className="flex-1">
                            <p className={`text-xs font-semibold ${style.text}`}>{issue.message}</p>
                            {issue.nodeIds.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {issue.nodeIds.slice(0, 3).map((nid) => {
                                  const n = nodes.find((nd) => nd.id === nid)
                                  return n ? (
                                    <button
                                      key={nid}
                                      onClick={() => onSelectNode?.(nid)}
                                      className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-white"
                                    >
                                      {n.label}
                                    </button>
                                  ) : null
                                })}
                              </div>
                            )}
                            {issue.fix && (
                              <button
                                onClick={() => onApplyFix(issue.fix!.action)}
                                className="mt-1.5 flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-600"
                              >
                                <CheckCircle2 className="size-3" />
                                {issue.fix.label}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {health.issues.length === 0 && (
                    <div className="py-6 text-center text-xs text-gray-400">
                      <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-400" />
                      <p>No issues found! Your map is in great shape.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-gray-300" />
              </div>
            )}
          </div>
        )}

        {/* ── Prerequisites Section ────────────────────────────────────── */}
        {activeSection === 'prerequisites' && (
          <div className="p-3 space-y-2">
            {prereqs.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <GitFork className="mx-auto mb-2 size-6 text-gray-300" />
                <p>No missing prerequisites detected.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-gray-500">
                  Found {prereqs.length} potential prerequisite{prereqs.length !== 1 ? 's' : ''} to add.
                </p>
                {prereqs.map((p, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                      <button onClick={() => onSelectNode?.(p.fromNodeId)} className="truncate hover:text-[#0033A0]">
                        {p.fromLabel}
                      </button>
                      <ChevronRight className="size-3 shrink-0 text-gray-400" />
                      <button onClick={() => onSelectNode?.(p.toNodeId)} className="truncate hover:text-[#0033A0]">
                        {p.toLabel}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">{p.reason}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        Confidence: {Math.round(p.confidence * 100)}%
                      </span>
                      <button
                        onClick={() => onApplyFix({
                          type: 'addEdge',
                          fromNodeId: p.fromNodeId,
                          toNodeId: p.toNodeId,
                          edgeType: p.confidence >= 0.8 ? 'PREREQUISITE' : 'SEQUENCE',
                        })}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-600"
                      >
                        <Plus className="size-3" />
                        Add
                      </button>
                    </div>
                  </div>
                ))}

                {prereqs.length > 1 && (
                  <button
                    onClick={() => {
                      for (const p of prereqs) {
                        onApplyFix({
                          type: 'addEdge',
                          fromNodeId: p.fromNodeId,
                          toNodeId: p.toNodeId,
                          edgeType: p.confidence >= 0.8 ? 'PREREQUISITE' : 'SEQUENCE',
                        })
                      }
                    }}
                    className="w-full rounded-lg bg-[#0033A0] py-2 text-xs font-semibold text-white hover:bg-[#002880]"
                  >
                    Add All ({prereqs.length})
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Schedule Section ─────────────────────────────────────────── */}
        {activeSection === 'schedule' && (
          <div className="p-3 space-y-2">
            {conflicts.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                <Calendar className="mx-auto mb-2 size-6 text-gray-300" />
                <p>No scheduling conflicts detected.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-gray-500">
                  Found {conflicts.length} scheduling issue{conflicts.length !== 1 ? 's' : ''}.
                </p>
                {conflicts.map((c, i) => {
                  const style = severityStyles[c.severity]
                  const SevIcon = style.icon
                  return (
                    <div key={i} className={`rounded-xl border ${style.border} ${style.bg} p-2.5`}>
                      <div className="flex items-start gap-2">
                        <SevIcon className={`mt-0.5 size-3.5 shrink-0 ${style.iconColor}`} />
                        <div>
                          <p className={`text-xs font-semibold ${style.text}`}>{c.issue}</p>
                          <p className="mt-1 text-[10px] text-gray-500">{c.suggestion}</p>
                          {c.labels.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {c.labels.slice(0, 4).map((label, j) => (
                                <span key={j} className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── Workload Section ─────────────────────────────────────────── */}
        {activeSection === 'workload' && (
          <div className="p-3 space-y-3">
            {workload ? (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                    <p className="text-lg font-extrabold text-gray-800">{workload.average}</p>
                    <p className="text-[10px] text-gray-500">Avg Weight</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                    <p className="text-lg font-extrabold text-gray-800">{workload.peak}</p>
                    <p className="text-[10px] text-gray-500">Peak</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                    <p className="text-lg font-extrabold text-gray-800">{workload.imbalances.length}</p>
                    <p className="text-[10px] text-gray-500">Imbalances</p>
                  </div>
                </div>

                {/* Bar chart */}
                {workload.entries.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold text-gray-500 uppercase">Workload Distribution</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={workload.entries} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                        <XAxis dataKey="weekLabel" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 11 }}
                          formatter={(value: unknown, name: unknown) => [String(value), name === 'totalWeight' ? 'Weight' : String(name)]}
                          labelFormatter={(label: unknown) => {
                            const labelStr = String(label)
                            const entry = workload.entries.find((e) => e.weekLabel === labelStr)
                            return entry ? `${labelStr} — ${entry.unitLabel}` : labelStr
                          }}
                        />
                        <Bar dataKey="totalWeight" radius={[4, 4, 0, 0]}>
                          {workload.entries.map((entry, i) => {
                            const isImbalanced = workload.imbalances.some((imb) => imb.label === entry.unitLabel)
                            return (
                              <Cell
                                key={i}
                                fill={isImbalanced ? '#f59e0b' : '#0033A0'}
                              />
                            )
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Imbalances */}
                {workload.imbalances.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Imbalances</p>
                    {workload.imbalances.map((imb, i) => {
                      const style = severityStyles[imb.severity]
                      const SevIcon = style.icon
                      return (
                        <div key={i} className={`rounded-xl border ${style.border} ${style.bg} p-2.5`}>
                          <div className="flex items-start gap-2">
                            <SevIcon className={`mt-0.5 size-3.5 shrink-0 ${style.iconColor}`} />
                            <div>
                              <p className={`text-xs font-semibold ${style.text}`}>
                                {imb.label}: {imb.deviation}
                              </p>
                              <p className="mt-0.5 text-[10px] text-gray-500">{imb.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {workload.imbalances.length === 0 && workload.entries.length > 0 && (
                  <div className="py-3 text-center text-xs text-gray-400">
                    <CheckCircle2 className="mx-auto mb-1 size-5 text-emerald-400" />
                    Workload is well-balanced!
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-gray-300" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
