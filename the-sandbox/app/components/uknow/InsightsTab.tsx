'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from '../DynamicChart'
import {
  Sparkles, ChevronDown, Newspaper, Users, Hash, TrendingUp,
  Loader2, Building2, BarChart3, Network,
} from 'lucide-react'
import { KnowledgeGraph } from './KnowledgeGraph'
import type {
  InsightsDashboard, GraphNode, GraphEdge,
} from '../../lib/uknow-insights-service'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InsightsTabProps {
  userEmail: string
  isAdmin: boolean
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon }: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5 flex items-center gap-4">
      <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
        <Icon className="size-5 text-[#0033A0]" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

// ─── Topic Cloud ─────────────────────────────────────────────────────────────

function TopicCloud({ topics }: { topics: Array<{ topic: string; count: number }> }) {
  if (topics.length === 0) return null
  const maxCount = Math.max(...topics.map((t) => t.count))
  const minCount = Math.min(...topics.map((t) => t.count))

  function getSize(count: number): string {
    if (maxCount === minCount) return 'text-sm'
    const ratio = (count - minCount) / (maxCount - minCount)
    if (ratio > 0.75) return 'text-xl font-extrabold'
    if (ratio > 0.5) return 'text-lg font-bold'
    if (ratio > 0.25) return 'text-base font-semibold'
    return 'text-sm font-medium'
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
      <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
        <Hash className="size-4 text-[#0033A0]" />
        Topic Cloud
      </h3>
      <div className="flex flex-wrap gap-x-3 gap-y-2 items-baseline">
        {topics.map((t) => (
          <span
            key={t.topic}
            className={`${getSize(t.count)} text-gray-700 hover:text-[#0033A0] transition-colors cursor-default`}
            title={`${t.count} article${t.count !== 1 ? 's' : ''}`}
          >
            {t.topic}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Top Mentions List ───────────────────────────────────────────────────────

function TopMentions({ mentions }: { mentions: InsightsDashboard['topMentions'] }) {
  if (mentions.length === 0) return null

  const typeColors: Record<string, string> = {
    person: 'bg-purple-50 text-purple-700 border-purple-200',
    department: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    topic: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
      <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="size-4 text-[#0033A0]" />
        Top Mentions
      </h3>
      <div className="flex flex-col gap-2">
        {mentions.slice(0, 12).map((m) => (
          <div key={`${m.type}-${m.name}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeColors[m.type]}`}>
                {m.type === 'person' ? 'Person' : 'Dept'}
              </span>
              <span className="text-sm text-gray-900 font-medium truncate">{m.name}</span>
            </div>
            <span className="shrink-0 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {m.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Section Breakdown ───────────────────────────────────────────────────────

function SectionBreakdown({ sections }: { sections: InsightsDashboard['sectionBreakdown'] }) {
  if (sections.length === 0) return null

  const data = sections.slice(0, 8).map((s) => ({
    name: s.sectionLabel,
    count: s.count,
  }))

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
      <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="size-4 text-[#0033A0]" />
        Coverage by Section
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 13 }}
            formatter={(value) => [`${value} articles`, 'Count']}
          />
          <Bar dataKey="count" fill="#0033A0" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Coverage Over Time ──────────────────────────────────────────────────────

function CoverageChart({ data }: { data: InsightsDashboard['coverageByMonth'] }) {
  if (data.length === 0) return null

  // Aggregate to total per month for the area chart
  const monthTotals = new Map<string, number>()
  for (const d of data) {
    monthTotals.set(d.month, (monthTotals.get(d.month) ?? 0) + d.count)
  }
  const chartData = [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: month.slice(2), // "25-01" for display
      count,
    }))

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
      <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="size-4 text-[#0033A0]" />
        Coverage Over Time
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0033A0" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0033A0" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 13 }}
            formatter={(value) => [`${value} articles`, 'Published']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#0033A0"
            strokeWidth={2}
            fill="url(#coverageGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Intelligence Brief ──────────────────────────────────────────────────────

function IntelligenceBrief({ brief, college }: { brief: string | null; college: string }) {
  if (!brief) return null

  return (
    <div className="border-2 border-blue-200 rounded-2xl bg-blue-50/50 p-5 flex gap-3">
      <Sparkles className="size-5 text-[#0033A0] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0] mb-2">
          Intelligence Brief — {college || 'All UK'}
        </p>
        <p className="text-sm text-gray-800 leading-relaxed">{brief}</p>
      </div>
    </div>
  )
}

// ─── Main InsightsTab ────────────────────────────────────────────────────────

export function InsightsTab({ userEmail, isAdmin }: InsightsTabProps) {
  const [college, setCollege] = useState('')
  const [days, setDays] = useState(90)
  const [data, setData] = useState<InsightsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [showGraph, setShowGraph] = useState(false)

  const fetchInsights = useCallback(async (c: string, d: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ days: String(d) })
      if (c) params.set('college', c)
      const res = await fetch(`/api/uknow/insights?${params}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  const fetchGraph = useCallback(async (c: string, d: number) => {
    setGraphLoading(true)
    try {
      const params = new URLSearchParams({ days: String(d), limit: '40' })
      if (c) params.set('college', c)
      const res = await fetch(`/api/uknow/knowledge-graph?${params}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) {
        const json = await res.json()
        setGraphData(json)
      }
    } finally {
      setGraphLoading(false)
    }
  }, [userEmail])

  useEffect(() => {
    void fetchInsights(college, days)
  }, [college, days, fetchInsights])

  useEffect(() => {
    if (showGraph) {
      void fetchGraph(college, days)
    }
  }, [showGraph, college, days, fetchGraph])

  return (
    <div className="flex flex-col gap-6">
      {/* Controls strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <select
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className="pl-9 pr-8 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:border-[#0033A0] appearance-none cursor-pointer"
          >
            <option value="">All UK</option>
            {data?.colleges.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex gap-1">
          {[30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                days === d
                  ? 'bg-[#0033A0] text-white border-[#0033A0]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {d === 365 ? '1 year' : `${d} days`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowGraph(!showGraph)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
            showGraph
              ? 'bg-[#0033A0] text-white border-[#0033A0]'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Network className="size-4" />
          Knowledge Graph
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-[#0033A0]" />
          <p className="text-sm text-gray-500">Analyzing coverage…</p>
        </div>
      ) : data ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Articles" value={data.kpi.totalArticles} icon={Newspaper} />
            <KPICard label={`Last ${days} Days`} value={data.kpi.articlesInPeriod} icon={TrendingUp} />
            <KPICard label="People Mentioned" value={data.kpi.uniquePeopleMentioned} icon={Users} />
            <KPICard label="Unique Topics" value={data.kpi.uniqueTopics} icon={Hash} />
          </div>

          {/* Intelligence Brief */}
          <IntelligenceBrief brief={data.brief} college={college} />

          {/* Coverage Chart */}
          <CoverageChart data={data.coverageByMonth} />

          {/* Two-column: Section Breakdown + Top Mentions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionBreakdown sections={data.sectionBreakdown} />
            <TopMentions mentions={data.topMentions} />
          </div>

          {/* Topic Cloud */}
          <TopicCloud topics={data.topicCloud} />

          {/* Knowledge Graph (expandable) */}
          {showGraph && (
            <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
              <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <Network className="size-4 text-[#0033A0]" />
                Entity Network — {college || 'All UK'}
              </h3>
              {graphLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-[#0033A0]" />
                </div>
              ) : graphData && graphData.nodes.length > 0 ? (
                <KnowledgeGraph nodes={graphData.nodes} edges={graphData.edges} />
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  Not enough entity data to build a network. Try a broader time range.
                </p>
              )}
            </div>
          )}

          {/* Admin: Citation Analytics */}
          {isAdmin && <CitationAnalytics userEmail={userEmail} />}
        </>
      ) : null}
    </div>
  )
}

// ─── Citation Analytics (Admin Only) ─────────────────────────────────────────

function CitationAnalytics({ userEmail }: { userEmail: string }) {
  const [stats, setStats] = useState<{
    totalCitations: number
    uniqueArticlesCited: number
    topArticles: Array<{ title: string; slug: string; citationCount: number }>
    recentCitations: Array<{ userName: string; articleTitle: string; createdAt: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/uknow/citation-stats?days=30', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userEmail])

  if (loading || !stats) return null

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
      <h3 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="size-4 text-[#0033A0]" />
        Sandy Citation Analytics (Admin)
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-[#0033A0]">{stats.totalCitations}</p>
          <p className="text-xs text-gray-600">Total Citations (30d)</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-[#0033A0]">{stats.uniqueArticlesCited}</p>
          <p className="text-xs text-gray-600">Unique Articles Cited</p>
        </div>
      </div>

      {stats.topArticles.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Most Cited Articles</p>
          <div className="flex flex-col gap-1.5">
            {stats.topArticles.slice(0, 5).map((a) => (
              <div key={a.slug} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 truncate">{a.title}</span>
                <span className="shrink-0 ml-2 text-xs font-bold text-[#0033A0] bg-blue-50 px-2 py-0.5 rounded-full">
                  {a.citationCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
