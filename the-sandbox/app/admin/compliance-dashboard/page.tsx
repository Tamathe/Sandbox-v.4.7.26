'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from '../../components/DynamicChart'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'

type ScoreBucket = { bucket: string; count: number }
type ScoreTrend = { month: string; avgScore: number }
type DeptBreakdown = { department: string; avgScore: number }
type FerpaFunnelStep = { stage: string; count: number }
type IncidentMetric = {
  severity: string
  total: number
  resolved: number
  open: number
  investigating: number
  avgResolutionDays: number
}

type AnalyticsData = {
  scoreDistribution: ScoreBucket[]
  scoreTrend: ScoreTrend[]
  departmentBreakdown: DeptBreakdown[]
  ferpaFunnel: FerpaFunnelStep[]
  incidentMetrics: IncidentMetric[]
  totalUsers: number
}

const BUCKET_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e']
const UK_BLUE = '#0033A0'

export default function ComplianceDashboardPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/compliance-analytics', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.status === 403) { router.replace('/'); return }
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email, router])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') { router.replace('/'); return }
    void fetchAnalytics()
  }, [currentUser.role, fetchAnalytics, router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-red-600">Failed to load compliance analytics.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          style={{ color: UK_BLUE }}
        >
          <ArrowLeft className="size-4" />
          Back to Admin
        </Link>
      </div>

      <PageHeader
        title="Compliance Dashboard"
        subtitle={`Analytics across ${data.totalUsers} active users`}
      />

      <div className="mt-8 space-y-8">
        {/* Score Distribution Histogram */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Score Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Score Trend Over Time */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Average Score Trend (6 Months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke={UK_BLUE}
                  strokeWidth={2}
                  dot={{ fill: UK_BLUE, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Department Breakdown */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Department Avg Compliance Score</h2>
          {data.departmentBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No department data available.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill={UK_BLUE} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* FERPA Training Funnel */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">FERPA Training Completion Funnel</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ferpaFunnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill={UK_BLUE} radius={[6, 6, 0, 0]}>
                  {data.ferpaFunnel.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#94a3b8' : i === 1 ? '#3b82f6' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Incident Resolution Metrics */}
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="text-base font-extrabold text-gray-900 mb-4">Incident Resolution by Severity</h2>
          {data.incidentMetrics.every((m) => m.total === 0) ? (
            <p className="text-sm text-gray-500">No incidents recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-semibold">Severity</th>
                    <th className="pb-2 pr-4 font-semibold">Total</th>
                    <th className="pb-2 pr-4 font-semibold">Open</th>
                    <th className="pb-2 pr-4 font-semibold">Investigating</th>
                    <th className="pb-2 pr-4 font-semibold">Resolved</th>
                    <th className="pb-2 font-semibold">Avg Days to Resolve</th>
                  </tr>
                </thead>
                <tbody>
                  {data.incidentMetrics.map((m) => {
                    const sevStyles: Record<string, string> = {
                      critical: 'bg-red-100 text-red-700',
                      high: 'bg-orange-100 text-orange-700',
                      medium: 'bg-amber-100 text-amber-700',
                      low: 'bg-emerald-100 text-emerald-700',
                    }
                    return (
                      <tr key={m.severity} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sevStyles[m.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                            {m.severity}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{m.total}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{m.open}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{m.investigating}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{m.resolved}</td>
                        <td className="py-2.5 text-gray-600">{m.avgResolutionDays > 0 ? `${m.avgResolutionDays}d` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
