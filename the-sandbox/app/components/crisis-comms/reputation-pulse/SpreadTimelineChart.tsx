'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from '../../DynamicChart'

interface TimelineBucket {
  hour: number
  label: string
  positive: number
  neutral: number
  negative: number
  total: number
}

export function SpreadTimelineChart({ data }: { data: TimelineBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value: unknown, name: unknown) => {
            const labels: Record<string, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }
            return [String(value), labels[String(name)] ?? String(name)]
          }}
        />
        <Area type="monotone" dataKey="positive" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
        <Area type="monotone" dataKey="neutral" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
        <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
