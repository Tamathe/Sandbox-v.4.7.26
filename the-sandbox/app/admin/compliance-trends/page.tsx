'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '../../components/DynamicChart'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import ErrorBanner from '../../components/ErrorBanner'

type MonthData = {
  label: string
  avgScore: number
  consentCoverage: number
  ferpaRate: number
  incidents: number
  newDpas: number
}

type TrendDirection = 'improving' | 'declining' | 'stable'

type TrendResult = {
  months: MonthData[]
  projections: {
    nextMonthScore: number
    trend: TrendDirection
  }
  insights: string[]
}

const TREND_CONFIG: Record<TrendDirection, { icon: typeof TrendingUp; color: string; label: string }> = {
  improving: { icon: TrendingUp, color: 'text-green-600 bg-green-50 border-green-200', label: 'Improving' },
  declining: { icon: TrendingDown, color: 'text-red-600 bg-red-50 border-red-200', label: 'Declining' },
  stable: { icon: Minus, color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Stable' },
}

export default function ComplianceTrendsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<TrendResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState(6)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      router.push('/')
      return
    }

    setLoading(true)
    const headers = { 'x-demo-user-email': currentUser.email }

    fetch(`/api/admin/compliance-trends-analysis?months=${months}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load trend data')
        return r.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [currentUser, router, months])

  if (!currentUser || currentUser.role !== 'ADMIN') return null

  const trendConfig = data ? TREND_CONFIG[data.projections.trend] : null
  const TrendIcon = trendConfig?.icon ?? Minus

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Compliance Trends"
        subtitle="Compliance metrics over time with projections"
        action={
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0033A0] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Time Period Selector */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-medium text-gray-600">Period:</span>
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                months === m
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m} months
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-[#0033A0]" />
            <span className="ml-3 text-gray-500">Analyzing trends...</span>
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        {data && (
          <div className="space-y-8">
            {/* Projection Badge */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold ${trendConfig?.color}`}>
                <TrendIcon className="size-4" />
                Trend: {trendConfig?.label}
              </div>
              <span className="text-sm text-gray-500">
                Projected next month score: <strong className="text-gray-900">{data.projections.nextMonthScore}/100</strong>
              </span>
            </div>

            {/* Chart */}
            <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Compliance Metrics Over Time</h2>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.months} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      name="Avg Score"
                      stroke="#0033A0"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="consentCoverage"
                      name="Consent Coverage %"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ferpaRate"
                      name="FERPA Rate %"
                      stroke="#d97706"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights */}
            {data.insights.length > 0 && (
              <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="size-5 text-[#0033A0]" />
                  <h2 className="text-lg font-extrabold text-gray-900">Insights</h2>
                </div>
                <div className="space-y-3">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="size-6 rounded-full bg-[#0033A0]/10 text-[#0033A0] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Data Table */}
            <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Monthly Data</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-5 py-3 font-semibold text-gray-600">Month</th>
                      <th className="px-5 py-3 font-semibold text-gray-600">Avg Score</th>
                      <th className="px-5 py-3 font-semibold text-gray-600">Consent %</th>
                      <th className="px-5 py-3 font-semibold text-gray-600">FERPA %</th>
                      <th className="px-5 py-3 font-semibold text-gray-600">Incidents</th>
                      <th className="px-5 py-3 font-semibold text-gray-600">New DPAs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.months.map((month) => (
                      <tr key={month.label} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{month.label}</td>
                        <td className="px-5 py-3 text-gray-700">{month.avgScore}</td>
                        <td className="px-5 py-3 text-gray-700">{month.consentCoverage}%</td>
                        <td className="px-5 py-3 text-gray-700">{month.ferpaRate}%</td>
                        <td className="px-5 py-3 text-gray-700">{month.incidents}</td>
                        <td className="px-5 py-3 text-gray-700">{month.newDpas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
