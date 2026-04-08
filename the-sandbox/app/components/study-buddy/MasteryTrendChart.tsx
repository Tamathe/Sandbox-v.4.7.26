'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from '../DynamicChart'

interface MasteryWeek {
  week: string
  avgScore: number
  sessions: number
}

export function MasteryTrendChart({ data }: { data: MasteryWeek[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={20}>
        <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(value) => [`${value}%`, 'Avg Score']}
        />
        <Bar dataKey="avgScore" fill="#0033A0" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
