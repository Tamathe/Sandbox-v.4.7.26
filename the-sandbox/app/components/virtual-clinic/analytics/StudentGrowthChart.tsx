'use client'

import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '../../DynamicChart'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { ChartPanel } from '../../analytics/ChartPanel'
import { useChartData } from '../../../hooks/useChartData'
import type { StudentGrowthData } from '../../../lib/virtual-clinic/analytics-service'

const LEVEL_COLORS: Record<string, string> = {
  NOVICE: '#9ca3af',
  DEVELOPING: '#3b82f6',
  COMPETENT: '#22c55e',
  PROFICIENT: '#10b981',
}

const TREND_CONFIG = {
  improving: { icon: TrendingUp, label: 'Improving', color: 'text-green-600', bg: 'bg-green-50' },
  declining: { icon: TrendingDown, label: 'Declining', color: 'text-red-600', bg: 'bg-red-50' },
  stable: { icon: Minus, label: 'Stable', color: 'text-gray-600', bg: 'bg-gray-50' },
} as const

const DOMAIN_LABELS: Record<string, string> = {
  history: 'History Taking',
  exam: 'Physical Exam',
  differential: 'Differential Dx',
  plan: 'Diagnostic Plan',
  communication: 'Communication',
}

interface CustomDotProps {
  cx?: number
  cy?: number
  payload?: { level: string }
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null
  return <circle cx={cx} cy={cy} r={5} fill={LEVEL_COLORS[payload.level] ?? '#9ca3af'} stroke="#fff" strokeWidth={2} />
}

function StudentGrowthChart() {
  const { data, loading, error } = useChartData<StudentGrowthData>(
    '/api/virtual-clinic/analytics/student',
  )

  const chartData = useMemo(() => data?.encounters.map((e) => ({
    date: new Date(e.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(e.overallScore),
    level: e.overallLevel,
    case: e.caseTitle,
  })) ?? [], [data?.encounters])

  const TrendIcon = data ? TREND_CONFIG[data.trend].icon : Minus
  const trendCfg = data ? TREND_CONFIG[data.trend] : TREND_CONFIG.stable

  return (
    <ChartPanel
      title="Score Progression"
      subtitle="Overall score across encounters"
      icon={Activity}
      loading={loading}
      error={error}
      isEmpty={!data || data.encounters.length === 0}
      emptyMessage="Complete your first encounter to see growth data"
    >
      {data && (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Score']}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(_: any, payload: any) => {
                  const item = (payload as Array<{ payload?: { case?: string } }>)?.[0]?.payload
                  return item?.case ?? ''
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0033A0"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="border rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Rolling Avg (last 5)</p>
              <p className="text-lg font-extrabold text-gray-900">
                {data.rollingAverage !== null ? `${Math.round(data.rollingAverage)}%` : '—'}
              </p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${trendCfg.bg}`}>
              <p className="text-xs text-gray-500 mb-1">Trend</p>
              <div className={`flex items-center justify-center gap-1 ${trendCfg.color}`}>
                <TrendIcon className="size-4" />
                <span className="text-sm font-semibold">{trendCfg.label}</span>
              </div>
            </div>
            <div className="border rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Strongest</p>
              <p className="text-sm font-semibold text-green-700">
                {data.strongestDomain ? DOMAIN_LABELS[data.strongestDomain] ?? data.strongestDomain : '—'}
              </p>
            </div>
            <div className="border rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Weakest</p>
              <p className="text-sm font-semibold text-amber-700">
                {data.weakestDomain ? DOMAIN_LABELS[data.weakestDomain] ?? data.weakestDomain : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </ChartPanel>
  )
}

export default React.memo(StudentGrowthChart)
