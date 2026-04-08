'use client'

import React from 'react'
import { TrendingDown } from 'lucide-react'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '../DynamicChart'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type TrendPoint = {
  weekLabel: string
  atRiskCount: number
  totalActive: number
}

type Props = {
  courseId: string
  userEmail: string
}

function AtRiskTrendChart({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ trend: TrendPoint[] }>(
    `/api/analytics/faculty/at-risk-trend?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )

  const trend = data?.trend ?? null
  const isEmpty = trend != null && trend.every(p => p.totalActive === 0)

  return (
    <ChartPanel
      title="At-Risk Trend"
      subtitle="8 weeks"
      icon={TrendingDown}
      iconClassName="text-red-500"
      loading={loading}
      error={error}
      errorMessage="Failed to load trend data."
      isEmpty={isEmpty}
      emptyMessage="No session data in the last 8 weeks."
    >
      {trend && (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="atRiskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="atRiskCount"
              name="At-Risk Students"
              stroke="#ef4444"
              fill="url(#atRiskGrad)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="totalActive"
              name="Total Active"
              stroke="#0033A0"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}

export default React.memo(AtRiskTrendChart)
