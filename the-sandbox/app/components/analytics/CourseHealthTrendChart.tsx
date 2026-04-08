'use client'

import React from 'react'
import { Activity } from 'lucide-react'
import {
  ComposedChart,
  Bar,
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

type WeekRow = {
  week: string
  avgScore: number | null
  atRiskCount: number
  sessionCount: number
}

type Props = {
  courseId: string
  userEmail: string
}

function CourseHealthTrendChart({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ weeks: WeekRow[] }>(
    `/api/analytics/faculty/course-health-trend?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )

  const weeks = data?.weeks ?? []

  return (
    <ChartPanel
      title="Course Health Trend"
      icon={Activity}
      loading={loading}
      error={error}
      errorMessage="Failed to load course health data."
      isEmpty={weeks.length === 0}
      emptyMessage="No session data yet for this course."
      headerRight={<span className="ml-auto text-xs text-gray-400">Last 8 weeks</span>}
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={weeks} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => {
              if (name === 'Avg Score') return [`${value}%`, name as string]
              return [value as number, name as string]
            }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar
            yAxisId="left"
            dataKey="sessionCount"
            name="Sessions"
            fill="#0033A0"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgScore"
            name="Avg Score"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: '#f59e0b' }}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="atRiskCount"
            name="At-Risk Students"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3, fill: '#ef4444' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

export default React.memo(CourseHealthTrendChart)
