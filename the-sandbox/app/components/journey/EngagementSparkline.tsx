'use client'

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from '../DynamicChart'

interface EngagementSparklineProps {
  data: Array<{ weekOf: string; engagementScore: number }>
  compact?: boolean
}

export default function EngagementSparkline({ data, compact }: EngagementSparklineProps) {
  const chartData = data.map(d => ({
    week: new Date(d.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(d.engagementScore * 100),
  }))

  if (compact) {
    return (
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Area
              type="monotone"
              dataKey="score"
              stroke="#0033A0"
              fill="#0033A0"
              fillOpacity={0.1}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-6">
      <h2 className="text-lg font-extrabold text-gray-900 mb-4">Engagement Over Time</h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, 'Engagement']}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#0033A0"
              fill="#0033A0"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
