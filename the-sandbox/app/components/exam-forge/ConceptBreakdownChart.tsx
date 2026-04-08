'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from '../DynamicChart'

interface ConceptData {
  concept: string
  score: number
}

function getBarColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

export function ConceptBreakdownChart({ data }: { data: ConceptData[] }) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 20} minHeight={120}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
        <YAxis
          type="category"
          dataKey="concept"
          width={120}
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Score']}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
