'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from '../../DynamicChart'

interface ViewsByDay {
  date: string
  count: number
}

export function ShareAnalyticsChart({ data }: { data: ViewsByDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={24} />
        <Tooltip
          labelFormatter={(d) => String(d)}
          formatter={(value) => [`${value} views`, 'Views']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#0033A0" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
