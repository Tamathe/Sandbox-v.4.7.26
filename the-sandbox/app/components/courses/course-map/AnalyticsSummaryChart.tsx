'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from '../../DynamicChart'

interface PointsPerWeek {
  name: string
  points: number
  assignments: number
  objectives: number
}

export function AnalyticsSummaryChart({ data }: { data: PointsPerWeek[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={30} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
          formatter={(value) => [String(value), 'Points']}
        />
        <Bar dataKey="points" fill="#0033A0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
