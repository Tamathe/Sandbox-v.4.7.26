'use client'

import React from 'react'
import { Zap } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from '../DynamicChart'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type SeriesEntry = {
  weekLabel: string
  avgBloom: number | null
  newConcepts: number
  courseCode: string
}

type Props = {
  userEmail: string
  userId: string
}

function ConceptVelocityChart({ userEmail, userId }: Props) {
  const { data, loading, error } = useChartData<{ series: SeriesEntry[] }>(
    userId ? `/api/analytics/student/concept-velocity?userId=${encodeURIComponent(userId)}` : '',
    { 'x-demo-user-email': userEmail }
  )

  const series = data?.series ?? null
  const isEmpty =
    !series || series.every(s => s.avgBloom == null && s.newConcepts === 0)

  return (
    <ChartPanel
      title="Concept Velocity"
      icon={Zap}
      loading={!userId || loading}
      error={error}
      errorMessage="Failed to load concept velocity."
      isEmpty={isEmpty}
      emptyMessage="No concept data yet"
      headerRight={<span className="ml-auto text-xs text-gray-400">Last 8 weeks</span>}
    >
      {series && (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={series} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              width={36}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[1, 6]}
              tick={{ fontSize: 11 }}
              width={32}
              tickCount={6}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="newConcepts"
              fill="#0033A0"
              name="New Concepts"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgBloom"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Bloom Level"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  )
}

export default React.memo(ConceptVelocityChart)
