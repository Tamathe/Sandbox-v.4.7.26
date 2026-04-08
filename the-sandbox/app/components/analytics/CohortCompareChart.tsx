'use client'

import React, { useMemo } from 'react'
import { Users } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '../DynamicChart'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type Cohort = {
  label: 'Top' | 'Mid' | 'Low'
  count: number
  avgScore: number
  avgSessionsPerStudent: number
  avgDurationMinutes: number
}

type Props = {
  courseId: string
  userEmail: string
}

function CohortCompareChart({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ cohorts: Cohort[]; noDataCount: number }>(
    `/api/analytics/faculty/cohort-compare?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )

  const cohorts = data?.cohorts ?? null
  const noDataCount = data?.noDataCount ?? 0

  const totalStudents = useMemo(() => cohorts
    ? cohorts.reduce((s, c) => s + c.count, 0) + noDataCount
    : null, [cohorts, noDataCount])

  const chartData = useMemo(() => cohorts?.map(c => ({
    name: c.label,
    'Avg Score (%)': Math.round(c.avgScore * 100),
    'Sessions / Student': c.avgSessionsPerStudent,
    'Avg Duration (min)': c.avgDurationMinutes,
  })), [cohorts])

  return (
    <ChartPanel
      title="Cohort Comparison"
      subtitle={totalStudents != null ? `${totalStudents} student${totalStudents !== 1 ? 's' : ''}` : undefined}
      icon={Users}
      loading={loading}
      error={error}
      errorMessage="Failed to load cohort data."
      isEmpty={cohorts != null && cohorts.length === 0}
      emptyMessage="No scored session data available for enrolled students."
    >
      {chartData && chartData.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Avg Score (%)" fill="#0033A0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sessions / Student" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Avg Duration (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Count table */}
          <div className="mt-3 flex gap-4 flex-wrap">
            {(cohorts ?? []).map(c => (
              <div key={c.label} className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{c.label}:</span> {c.count} student{c.count !== 1 ? 's' : ''}
              </div>
            ))}
          </div>

          {/* No-data note */}
          {noDataCount > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              {noDataCount} student{noDataCount !== 1 ? 's' : ''} excluded — no scored sessions yet.
            </p>
          )}
        </>
      )}
    </ChartPanel>
  )
}

export default React.memo(CohortCompareChart)
