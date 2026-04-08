'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  Users,
  Activity,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Flame,
  Clock,
  Zap,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from '../DynamicChart'
import {
  RealtimeAnalyticsManager,
  type RealtimeAnalyticsSnapshot,
  type NodeHeatmapEntry,
} from '../../lib/course-map/realtime-analytics'

// ── Props ────────────────────────────────────────────────────────────────────

interface AnalyticsDashboardPanelProps {
  courseId: string
  userEmail: string
  onClose: () => void
  onHeatmapData?: (data: NodeHeatmapEntry[]) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPanel({
  courseId,
  userEmail,
  onClose,
  onHeatmapData,
}: AnalyticsDashboardPanelProps) {
  const [snapshot, setSnapshot] = useState<RealtimeAnalyticsSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState({ sessions: true, heatmap: true, engagement: true })
  const [animatedCount, setAnimatedCount] = useState(0)
  const managerRef = useRef<RealtimeAnalyticsManager | null>(null)

  // ── Initialize manager ─────────────────────────────────────────────────

  useEffect(() => {
    const mgr = new RealtimeAnalyticsManager(courseId, userEmail, 10_000)
    managerRef.current = mgr

    const onUpdate = (data: RealtimeAnalyticsSnapshot) => {
      setSnapshot(data)
      onHeatmapData?.(data.heatmap)
    }
    const onConnected = () => setConnected(true)
    const onDisconnected = () => setConnected(false)

    mgr.on('update', onUpdate)
    mgr.on('connected', onConnected)
    mgr.on('disconnected', onDisconnected)
    mgr.start()

    return () => {
      mgr.destroy()
      managerRef.current = null
    }
  }, [courseId, userEmail, onHeatmapData])

  // ── Animated session counter ───────────────────────────────────────────

  useEffect(() => {
    const target = snapshot?.sessions.activeSessionCount ?? 0
    if (animatedCount === target) return
    const step = target > animatedCount ? 1 : -1
    const timer = setTimeout(() => setAnimatedCount((c) => c + step), 40)
    return () => clearTimeout(timer)
  }, [snapshot?.sessions.activeSessionCount, animatedCount])

  const toggleSection = useCallback((key: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const forceRefresh = useCallback(() => {
    managerRef.current?.stop()
    managerRef.current?.start()
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[26rem] bg-white border-l-2 border-gray-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#0033A0]/5 to-transparent">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">Real-Time Analytics</h3>
          <div className={`size-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={forceRefresh} className="p-1 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh now">
            <RefreshCw className="size-3.5 text-gray-500" />
          </button>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="size-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!snapshot ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Activity className="size-8 mb-2 animate-pulse" />
            <p className="text-sm">Connecting to live data...</p>
          </div>
        ) : (
          <>
            {/* ── Section 1: Live Sessions ── */}
            <CollapsibleSection
              title="Live Sessions"
              icon={<Users className="size-4 text-blue-500" />}
              open={sectionsOpen.sessions}
              onToggle={() => toggleSection('sessions')}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-center flex-1">
                  <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Active Sessions</span>
                  <p className="text-3xl font-extrabold text-blue-700 tabular-nums">{animatedCount}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-center flex-1">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Interactions</span>
                  <p className="text-3xl font-extrabold text-gray-800 tabular-nums">{snapshot.engagement.totalInteractions}</p>
                </div>
              </div>

              {snapshot.sessions.activeUsers.length > 0 && (
                <div className="space-y-1.5">
                  {snapshot.sessions.activeUsers.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm text-gray-800">{u.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(u.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* ── Section 2: Node Heatmap Legend ── */}
            <CollapsibleSection
              title="Node Heatmap"
              icon={<Flame className="size-4 text-orange-500" />}
              open={sectionsOpen.heatmap}
              onToggle={() => toggleSection('heatmap')}
            >
              {/* Color scale legend */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-gray-500">Low</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                  {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: RealtimeAnalyticsManager.intensityToColor(i) }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-500">High</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {snapshot.heatmap.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No node activity data yet</p>
                ) : (
                  snapshot.heatmap.slice(0, 15).map((h) => (
                    <div key={h.nodeId} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: RealtimeAnalyticsManager.intensityToColor(h.intensity) }}
                        />
                        <span className="text-xs text-gray-700 truncate">{h.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 ml-2 shrink-0">{h.activityCount}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleSection>

            {/* ── Section 3: Engagement Metrics ── */}
            <CollapsibleSection
              title="Engagement Metrics"
              icon={<TrendingUp className="size-4 text-green-500" />}
              open={sectionsOpen.engagement}
              onToggle={() => toggleSection('engagement')}
            >
              <div className="grid grid-cols-2 gap-3 mb-4">
                <MetricCard icon={<Clock className="size-3.5 text-purple-500" />} label="Avg Time on Node" value={`${Math.round(snapshot.engagement.avgTimeOnNodeSec)}s`} />
                <MetricCard icon={<Zap className="size-3.5 text-amber-500" />} label="Interaction Rate" value={`${snapshot.engagement.interactionRate}/session`} />
                <MetricCard icon={<TrendingUp className="size-3.5 text-green-500" />} label="Completion Velocity" value={`${snapshot.engagement.completionVelocity}`} />
                <MetricCard icon={<Users className="size-3.5 text-blue-500" />} label="Unique Visitors (7d)" value={`${snapshot.engagement.uniqueVisitors7d}`} />
              </div>

              {/* Completion velocity trend chart */}
              {snapshot.engagement.completionVelocityTrend.length > 1 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <h5 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity Trend</h5>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={snapshot.engagement.completionVelocityTrend} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9 }}
                        tickFormatter={(t: string) => {
                          const d = new Date(t)
                          return `${d.getMonth() + 1}/${d.getDate()}`
                        }}
                        interval={Math.max(0, Math.floor(snapshot.engagement.completionVelocityTrend.length / 5))}
                      />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="velocity" stroke="#0033A0" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-[10px] text-gray-400 text-center">
          Auto-refreshes every 10s
          {snapshot?.updatedAt && ` · Last: ${new Date(snapshot.updatedAt).toLocaleTimeString()}`}
        </p>
      </div>
    </div>
  )
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {icon}
        <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="size-3.5 text-gray-400" /> : <ChevronRight className="size-3.5 text-gray-400" />}
      </button>
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? '800px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className="p-3">{children}</div>
      </div>
    </div>
  )
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-extrabold text-gray-900">{value}</p>
    </div>
  )
}
