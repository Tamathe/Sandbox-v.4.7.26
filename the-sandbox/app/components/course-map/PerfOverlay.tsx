'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Download, Activity, Gauge, AlertTriangle } from 'lucide-react'
import {
  PerformanceProfiler,
  type ProfileReport,
  type Bottleneck,
  type WebVitalsSnapshot,
  type RenderBudgetStatus,
} from '../../lib/course-map/perf-profiler'

// ── Props ────────────────────────────────────────────────────────────────────

interface PerfOverlayProps {
  visible: boolean
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PerfOverlay({ visible, onClose }: PerfOverlayProps) {
  const [report, setReport] = useState<ProfileReport | null>(null)
  const profilerRef = useRef<PerformanceProfiler | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible) {
      profilerRef.current?.stop()
      if (refreshRef.current) clearInterval(refreshRef.current)
      return
    }

    const profiler = new PerformanceProfiler()
    profilerRef.current = profiler
    profiler.start()

    // Refresh report every 2 seconds
    const refresh = () => setReport(profiler.generateProfileReport())
    refresh()
    refreshRef.current = setInterval(refresh, 2000)

    return () => {
      profiler.destroy()
      profilerRef.current = null
      if (refreshRef.current) {
        clearInterval(refreshRef.current)
        refreshRef.current = null
      }
    }
  }, [visible])

  const exportReport = useCallback(() => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perf-profile-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[22rem] bg-gray-900/95 backdrop-blur-sm text-white rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-green-400" />
          <span className="text-xs font-bold">Performance Profiler</span>
          {report && (
            <span className="text-[10px] font-mono text-green-400">{report.fps} FPS</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportReport} className="p-1 rounded hover:bg-gray-700 transition-colors" title="Export profile JSON">
            <Download className="size-3.5 text-gray-400" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-700 transition-colors">
            <X className="size-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {!report ? (
        <div className="px-3 py-6 text-center text-gray-500 text-xs">Collecting data...</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {/* Web Vitals Gauges */}
          <div className="px-3 py-2 border-b border-gray-800">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Web Vitals</h4>
            <div className="grid grid-cols-5 gap-1.5">
              <VitalGauge label="LCP" value={report.webVitals.lcp} unit="ms" thresholds={[2500, 4000]} />
              <VitalGauge label="FID" value={report.webVitals.fid} unit="ms" thresholds={[100, 300]} />
              <VitalGauge label="CLS" value={report.webVitals.cls} unit="" thresholds={[0.1, 0.25]} decimals={3} />
              <VitalGauge label="TTFB" value={report.webVitals.ttfb} unit="ms" thresholds={[800, 1800]} />
              <VitalGauge label="INP" value={report.webVitals.inp} unit="ms" thresholds={[200, 500]} />
            </div>
          </div>

          {/* Render Budget Bar */}
          <div className="px-3 py-2 border-b border-gray-800">
            <RenderBudgetBar budget={report.renderBudget} />
          </div>

          {/* Bottleneck List */}
          {report.bottlenecks.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-800">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Bottlenecks ({report.bottlenecks.length})
              </h4>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {report.bottlenecks.slice(0, 8).map((b, i) => (
                  <BottleneckRow key={`${b.name}-${i}`} bottleneck={b} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="px-3 py-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tips</h4>
              <div className="space-y-1">
                {report.recommendations.slice(0, 3).map((rec, i) => (
                  <p key={i} className="text-[10px] text-gray-400 leading-relaxed">{rec}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-800 bg-gray-900/50">
        <p className="text-[9px] text-gray-600 text-center">Ctrl+Shift+P to toggle · Dev only</p>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VitalGauge({
  label,
  value,
  unit,
  thresholds,
  decimals = 0,
}: {
  label: string
  value: number | null
  unit: string
  thresholds: [number, number]
  decimals?: number
}) {
  const status = value === null ? 'pending' : value <= thresholds[0] ? 'good' : value <= thresholds[1] ? 'warn' : 'poor'
  const color = status === 'good' ? 'text-green-400' : status === 'warn' ? 'text-amber-400' : status === 'poor' ? 'text-red-400' : 'text-gray-600'
  const ringColor = status === 'good' ? 'border-green-500' : status === 'warn' ? 'border-amber-500' : status === 'poor' ? 'border-red-500' : 'border-gray-700'

  return (
    <div className={`flex flex-col items-center p-1.5 rounded-lg border ${ringColor} bg-gray-800/50`}>
      <span className="text-[9px] font-bold text-gray-500 uppercase">{label}</span>
      <span className={`text-xs font-bold ${color} tabular-nums`}>
        {value !== null ? `${decimals > 0 ? value.toFixed(decimals) : Math.round(value)}` : '—'}
      </span>
      {value !== null && unit && <span className="text-[8px] text-gray-600">{unit}</span>}
    </div>
  )
}

function RenderBudgetBar({ budget }: { budget: RenderBudgetStatus }) {
  const pct = Math.min(budget.percentUsed, 200)
  const barColor = pct <= 60 ? 'bg-green-500' : pct <= 100 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-3.5 text-gray-400" />
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Render Budget</h4>
        </div>
        <span className="text-[10px] font-mono text-gray-500">
          {budget.avgFrameMs}ms / {budget.budgetMs.toFixed(1)}ms
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-gray-600">{budget.percentUsed}% used</span>
        <span className="text-[9px] text-gray-600">Last: {budget.lastFrameMs}ms</span>
      </div>
    </div>
  )
}

function BottleneckRow({ bottleneck }: { bottleneck: Bottleneck }) {
  const severityColor = {
    low: 'text-gray-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  }[bottleneck.severity]

  const typeLabel = {
    render: 'Render',
    api: 'API',
    layout: 'Layout',
    'long-task': 'Long Task',
  }[bottleneck.type]

  return (
    <div className="flex items-center justify-between px-2 py-1 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <AlertTriangle className={`size-3 shrink-0 ${severityColor}`} />
        <span className="text-[10px] text-gray-300 truncate">{bottleneck.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-[9px] text-gray-500">{typeLabel}</span>
        <span className="text-[10px] font-mono text-gray-400">p95: {Math.round(bottleneck.p95Ms)}ms</span>
      </div>
    </div>
  )
}
