'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '../../DynamicChart'
import { BarChart3, Users, Clock, Target, AlertTriangle } from 'lucide-react'
import { ChartPanel } from '../../analytics/ChartPanel'
import { useChartData } from '../../../hooks/useChartData'
import type { CaseAnalyticsData } from '../../../lib/virtual-clinic/analytics-service'

const LEVEL_COLORS: Record<string, string> = {
  NOVICE: '#9ca3af',
  DEVELOPING: '#3b82f6',
  COMPETENT: '#22c55e',
  PROFICIENT: '#10b981',
}

const LEVEL_LABELS: Record<string, string> = {
  NOVICE: 'Novice',
  DEVELOPING: 'Developing',
  COMPETENT: 'Competent',
  PROFICIENT: 'Proficient',
}

const DOMAIN_LABELS: Record<string, string> = {
  history: 'History',
  exam: 'Exam',
  differential: 'Differential',
  plan: 'Plan',
  communication: 'Comm.',
}

const BIAS_LABELS: Record<string, string> = {
  ANCHORING: 'Anchoring',
  PREMATURE_CLOSURE: 'Premature Closure',
  AVAILABILITY: 'Availability',
  CONFIRMATION: 'Confirmation',
}

interface CaseAnalyticsPanelProps {
  caseId: string
}

function CaseAnalyticsPanel({ caseId }: CaseAnalyticsPanelProps) {
  const { data, loading, error } = useChartData<CaseAnalyticsData>(
    `/api/virtual-clinic/analytics/case?caseId=${caseId}`,
  )

  const distData = useMemo(() => data
    ? (['NOVICE', 'DEVELOPING', 'COMPETENT', 'PROFICIENT'] as const).map((level) => ({
        level: LEVEL_LABELS[level],
        count: data.scoreDistribution[level],
        fill: LEVEL_COLORS[level],
      }))
    : [], [data])

  const domainData = useMemo(() => data
    ? Object.entries(data.domainAverages).map(([key, value]) => ({
        domain: DOMAIN_LABELS[key] ?? key,
        score: Math.round(value * 100) / 100,
      }))
    : [], [data])

  return (
    <ChartPanel
      title="Case Analytics"
      icon={BarChart3}
      loading={loading}
      error={error}
      isEmpty={!data || data.totalStarted === 0}
      emptyMessage="No encounters yet for this case"
    >
      {data && (
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border rounded-xl p-3 text-center">
              <Users className="size-4 text-[#0033A0] mx-auto mb-1" />
              <p className="text-xs text-gray-500">Encounters</p>
              <p className="text-lg font-extrabold text-gray-900">{data.totalStarted}</p>
            </div>
            <div className="border rounded-xl p-3 text-center">
              <Target className="size-4 text-[#0033A0] mx-auto mb-1" />
              <p className="text-xs text-gray-500">Completion</p>
              <p className="text-lg font-extrabold text-gray-900">{data.completionRate}%</p>
            </div>
            <div className="border rounded-xl p-3 text-center">
              <BarChart3 className="size-4 text-[#0033A0] mx-auto mb-1" />
              <p className="text-xs text-gray-500">Avg Score</p>
              <p className="text-lg font-extrabold text-gray-900">
                {data.averageScore !== null ? `${Math.round(data.averageScore)}%` : '—'}
              </p>
            </div>
            <div className="border rounded-xl p-3 text-center">
              <Clock className="size-4 text-[#0033A0] mx-auto mb-1" />
              <p className="text-xs text-gray-500">Avg Time</p>
              <p className="text-lg font-extrabold text-gray-900">
                {data.averageTimeMinutes !== null ? `${data.averageTimeMinutes}m` : '—'}
              </p>
            </div>
          </div>

          {/* Score distribution */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Score Distribution</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={distData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="level" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Domain averages — horizontal bars */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Domain Averages</h4>
            <div className="space-y-2">
              {domainData.map((d) => (
                <div key={d.domain} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 text-right">{d.domain}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-[#0033A0] rounded-full transition-all"
                      style={{ width: `${Math.min(d.score, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-10">
                    {Math.round(d.score)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Common biases */}
          {data.commonBiases.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-500" />
                Common Cognitive Biases
              </h4>
              <div className="space-y-1.5">
                {data.commonBiases.map((b) => (
                  <div key={b.type} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{BIAS_LABELS[b.type] ?? b.type}</span>
                    <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                      {b.count} occurrence{b.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ChartPanel>
  )
}

export default React.memo(CaseAnalyticsPanel)
