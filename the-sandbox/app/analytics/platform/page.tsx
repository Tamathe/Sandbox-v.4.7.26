'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { useApiFetch } from '../../hooks/useApiFetch'
import CurriculumSignalsSection from '../../components/analytics/CurriculumSignalsSection'
import EvaluatorInsightCallout from '../../components/EvaluatorInsightCallout'

type PlatformData = {
  totalUsers: number
  totalTools: number
  totalSessions: number
  sessionsLast30Days: number
  avgSessionScore: number | null
  adoptionByDepartment: { department: string; users: number; sessions: number }[]
  topTools: { id: string; name: string; sessions: number; avgScore: number | null }[]
  costEstimate: { totalTokensEstimate: number; costUsd: number; costPerSession: number }
}

export default function PlatformAnalyticsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const isAdmin = currentUser.role === 'ADMIN'
  const { data, error: swrError, isLoading: loading } = useApiFetch<PlatformData>(isAdmin ? '/api/analytics/platform' : null)
  const fetchError = !!swrError
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview')

  if (!isAdmin) {
    if (typeof window !== 'undefined') router.replace('/')
    return null
  }

  if (loading && !fetchError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="size-48 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-24" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 animate-pulse bg-gray-100 rounded-2xl h-64" />
          <div className="animate-pulse bg-gray-100 rounded-2xl h-64" />
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Failed to load platform analytics. Check your connection and try again.
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Platform Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.sessionsLast30Days.toLocaleString()} sessions in the last 30 days
          </p>
        </div>
        <div className="flex gap-2">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'curriculum', label: 'Curriculum' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                activeTab === key
                  ? 'border-[#0033A0] bg-[#0033A0] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'curriculum' && <CurriculumSignalsSection />}

      {activeTab === 'overview' && <>
      {/* KPI row — 4 tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',       value: data.totalUsers.toLocaleString() },
          { label: 'Published Tools',   value: data.totalTools.toLocaleString() },
          { label: 'Total Sessions',    value: data.totalSessions.toLocaleString() },
          { label: 'Cost Per Session',  value: `$${data.costEstimate.costPerSession.toFixed(4)}` },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border-2 border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <EvaluatorInsightCallout id="platform-tools">
        Every tool on this platform was created by faculty in minutes, not months. This is the adoption multiplier — zero-code AI tool creation means every department can participate without engineering resources.
      </EvaluatorInsightCallout>

      <EvaluatorInsightCallout id="platform-cost">
        At fractions of a cent per session, AI-powered learning is dramatically more cost-effective than traditional TA hours or commercial courseware licenses.
      </EvaluatorInsightCallout>

      {/* Two-column: 2/3 left + 1/3 right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Tools by Usage */}
        <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Top Tools by Usage</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-semibold">Tool</th>
                <th className="pb-2 font-semibold text-right">Sessions</th>
                <th className="pb-2 font-semibold text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {data.topTools.slice(0, 5).map(tool => (
                <tr key={tool.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 text-gray-800 font-medium truncate max-w-xs">{tool.name}</td>
                  <td className="py-2.5 text-gray-600 text-right">{tool.sessions.toLocaleString()}</td>
                  <td className="py-2.5 text-right">
                    {tool.avgScore != null ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        tool.avgScore >= 85 ? 'bg-green-100 text-green-700' :
                        tool.avgScore >= 75 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {tool.avgScore}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Users by Department */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Users by Department</h2>
          {data.adoptionByDepartment.length === 0 ? (
            <p className="text-sm text-gray-400">No department data available.</p>
          ) : (
            <div className="space-y-2">
              {data.adoptionByDepartment.slice(0, 8).map(dept => (
                <div key={dept.department} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate mr-2">{dept.department}</span>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{dept.users}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Session attribution by department is pending the analytics pipeline.
          </p>
        </div>
      </div>
      </>}
    </div>
  )
}
