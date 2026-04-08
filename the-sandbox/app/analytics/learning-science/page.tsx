'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useApiFetch } from '../../hooks/useApiFetch'
import PageHeader from '../../components/PageHeader'
import AnalyticsSubNav from '../../components/AnalyticsSubNav'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadialBarChart,
  RadialBar,
} from '../../components/DynamicChart'

// ─── Types ────────────────────────────────────────────────────────────────────

type BloomBar = {
  level: number
  label: string
  count: number
  pct: number
}

type CogTrend = {
  weekLabel: string
  avgLoad: number | null
  avgFrustration: number | null
}

type Misconception = {
  conceptSlug: string
  courseCode: string
  prevalence: number
  firedCount: number
}

type SRCompliance = {
  totalDue: number
  reviewedLast7Days: number
  complianceRate: number
}

type LearningScienceData = {
  bloomDistribution: BloomBar[]
  cognitiveLoadTrend: CogTrend[]
  misconceptionPrevalence: Misconception[]
  srCompliance: SRCompliance
}

// Bloom's Taxonomy colors (levels 1–6)
const BLOOM_COLORS = ['#94A3B8', '#60A5FA', '#34D399', '#FBBF24', '#F97316', '#A78BFA']

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatStrip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearningSciencePage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const isAdmin = currentUser.role === 'ADMIN'
  const { data, error: swrError, isLoading: loading } = useApiFetch<LearningScienceData>(isAdmin ? '/api/analytics/learning-science' : null)
  const error = !!swrError
  const [sortMisconceptions, setSortMisconceptions] = useState<'prevalence' | 'firedCount'>('prevalence')

  if (!isAdmin) {
    if (typeof window !== 'undefined') router.replace('/')
    return null
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="h-10 w-80 bg-gray-200 rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          Failed to load learning science data.
        </div>
      </div>
    )
  }

  // Compliance color
  const compliance = data.srCompliance.complianceRate
  const complianceColor = compliance >= 0.7 ? '#22c55e' : compliance >= 0.4 ? '#f59e0b' : '#ef4444'
  const compliancePct = Math.round(compliance * 100)

  // Radial bar data
  const radialData = [
    { name: 'Compliance', value: compliancePct, fill: complianceColor },
    { name: 'Remaining', value: 100 - compliancePct, fill: '#e5e7eb' },
  ]

  // Sorted misconceptions
  const sortedMisconceptions = [...data.misconceptionPrevalence].sort((a, b) =>
    sortMisconceptions === 'prevalence'
      ? b.prevalence - a.prevalence
      : b.firedCount - a.firedCount
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AnalyticsSubNav role={currentUser.role} />
      <PageHeader
        title="Learning Science Dashboard"
        subtitle="Platform-wide cognitive signals, Bloom distribution, and spaced repetition compliance"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── 1. Bloom Distribution ─────────────────────────────────────────── */}
        <section>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="size-4 text-[#0033A0]" />
              <h2 className="font-extrabold text-gray-900">Bloom&apos;s Taxonomy Distribution</h2>
              <span className="ml-auto text-xs text-gray-400">
                {data.bloomDistribution.reduce((s, b) => s + b.count, 0).toLocaleString()} sessions with Bloom level
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.bloomDistribution} layout="vertical" margin={{ left: 8, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={72} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.bloomDistribution.map((entry, idx) => (
                    <Cell key={`bloom-${idx}`} fill={BLOOM_COLORS[idx] ?? '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Count + % labels */}
            <div className="grid grid-cols-6 gap-2 mt-3">
              {data.bloomDistribution.map((b, idx) => (
                <div key={b.level} className="text-center">
                  <div
                    className="text-xs font-bold"
                    style={{ color: BLOOM_COLORS[idx] }}
                  >
                    {b.count}
                  </div>
                  <div className="text-xs text-gray-400">{b.pct}%</div>
                  <div className="text-xs text-gray-500 truncate">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. Cognitive Load & Frustration Trend ────────────────────────── */}
        <section>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="size-4 text-amber-500" />
              <h2 className="font-extrabold text-gray-900">Cognitive Load &amp; Frustration Trend</h2>
              <span className="ml-auto text-xs text-gray-400">Last 8 weeks · platform-wide</span>
            </div>
            {data.cognitiveLoadTrend.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No cognitive load data recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.cognitiveLoadTrend} margin={{ left: 0, right: 16 }}>
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgLoad"
                    name="Avg Cognitive Load"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="avgFrustration"
                    name="Avg Frustration"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── 3. Misconception Prevalence Heatmap ──────────────────────────── */}
        <section>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="size-4 text-red-500" />
              <h2 className="font-extrabold text-gray-900">Misconception Prevalence</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-400">Sort by:</span>
                <button
                  onClick={() => setSortMisconceptions('prevalence')}
                  className={`text-xs px-2 py-0.5 rounded-full ${sortMisconceptions === 'prevalence' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Prevalence
                </button>
                <button
                  onClick={() => setSortMisconceptions('firedCount')}
                  className={`text-xs px-2 py-0.5 rounded-full ${sortMisconceptions === 'firedCount' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Fired Count
                </button>
              </div>
            </div>
            {sortedMisconceptions.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No misconceptions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                      <th className="text-left py-2 pr-4 font-semibold">Concept</th>
                      <th className="text-left py-2 pr-4 font-semibold">Course</th>
                      <th className="text-left py-2 pr-4 font-semibold w-40">Prevalence</th>
                      <th className="text-right py-2 font-semibold">Fired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMisconceptions.map((m, idx) => (
                      <tr
                        key={`${m.courseCode}-${m.conceptSlug}-${idx}`}
                        className={`border-b border-gray-50 ${m.prevalence > 0.5 ? 'bg-red-50' : ''}`}
                      >
                        <td className="py-2.5 pr-4">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{m.conceptSlug}</span>
                          {m.prevalence > 0.5 && (
                            <AlertTriangle className="inline-block size-3 text-red-500 ml-1.5" />
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs">{m.courseCode}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.round(m.prevalence * 100)}%`,
                                  backgroundColor: m.prevalence > 0.5 ? '#ef4444' : m.prevalence > 0.25 ? '#f59e0b' : '#60a5fa',
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-9 text-right">
                              {Math.round(m.prevalence * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-700">{m.firedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── 4. Spaced Repetition Compliance ──────────────────────────────── */}
        <section>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle className="size-4 text-green-500" />
              <h2 className="font-extrabold text-gray-900">Spaced Repetition Compliance</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              {/* Stat strip */}
              <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                <StatStrip
                  label="Total Due"
                  value={data.srCompliance.totalDue.toLocaleString()}
                  sub="concepts needing review"
                />
                <StatStrip
                  label="Reviewed (7 days)"
                  value={data.srCompliance.reviewedLast7Days.toLocaleString()}
                  sub="concepts marked reviewed"
                />
                <StatStrip
                  label="Compliance Rate"
                  value={`${compliancePct}%`}
                  sub={compliance >= 0.7 ? 'On Track' : compliance >= 0.4 ? 'Needs Attention' : 'Critical'}
                />
              </div>

              {/* Donut / radial bar */}
              <div className="flex flex-col items-center">
                <ResponsiveContainer width={140} height={140}>
                  <RadialBarChart
                    innerRadius="60%"
                    outerRadius="100%"
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={4} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className="text-sm font-extrabold mt-1" style={{ color: complianceColor }}>
                  {compliancePct}%
                </p>
                <p className="text-xs text-gray-400">SR Compliance</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
