'use client'

import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from '../DynamicChart'

interface TrendData {
  date: Date | string
  readiness: number
}

interface ComplianceTrendChartProps {
  data: TrendData[]
}

function ComplianceTrendChart({ data }: ComplianceTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No trend data yet — snapshots will appear after daily cron runs
      </div>
    )
  }

  const chartData = useMemo(() => data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    readiness: Math.round(d.readiness * 100),
  })), [data])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} unit="%" />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip formatter={((value: number | string) => [`${value}%`, 'Readiness']) as any} />
        <Line
          type="monotone"
          dataKey="readiness"
          stroke="#0033A0"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default React.memo(ComplianceTrendChart)
