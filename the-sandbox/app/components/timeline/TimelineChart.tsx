'use client'

import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
} from '../DynamicChart'
import { ChartLine } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface TimelineEvent {
  id: string
  timestamp: string
  type: string
  title: string
  description: string
  magnitude: 'minor' | 'notable' | 'breakthrough'
  metadata: Record<string, unknown>
}

interface TimelineChartProps {
  events: TimelineEvent[]
}

interface DayData {
  date: string
  dateLabel: string
  avgScore: number
  count: number
  hasBrkthrgh: boolean
  hasNotable: boolean
}

const MAGNITUDE_COLORS: Record<string, string> = {
  breakthrough: '#eab308',
  notable: '#0033A0',
  minor: '#9ca3af',
}

function CustomDot(props: {
  cx?: number
  cy?: number
  payload?: DayData
}) {
  const { cx, cy, payload } = props
  if (!cx || !cy || !payload) return null
  const color = payload.hasBrkthrgh
    ? MAGNITUDE_COLORS.breakthrough
    : payload.hasNotable
      ? MAGNITUDE_COLORS.notable
      : MAGNITUDE_COLORS.minor
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />
}

function TimelineChart({ events }: TimelineChartProps) {
  const chartData = useMemo(() => {
    const sessionEvents = events.filter((e) => e.type === 'session' && e.metadata.score != null)

    const dayMap = new Map<string, { scores: number[]; magnitudes: Set<string> }>()
    for (const e of sessionEvents) {
      const day = e.timestamp.slice(0, 10)
      const entry = dayMap.get(day) ?? { scores: [], magnitudes: new Set<string>() }
      entry.scores.push((e.metadata.score as number) * 100)
      entry.magnitudes.add(e.magnitude)
      dayMap.set(day, entry)
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { scores, magnitudes }]) => ({
        date,
        dateLabel: format(parseISO(date), 'MMM d'),
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
        hasBrkthrgh: magnitudes.has('breakthrough'),
        hasNotable: magnitudes.has('notable'),
      }))
  }, [events])

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ChartLine className="size-4 text-[#0033A0]" />
          <h3 className="text-sm font-bold text-gray-900">Score Trend</h3>
        </div>
        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
          No session data to chart yet
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <ChartLine className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-bold text-gray-900">Score Trend</h3>
        <span className="ml-auto text-xs text-gray-400">{chartData.length} days</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '2px solid #e5e7eb',
              fontSize: 12,
              padding: '8px 12px',
            }}
            formatter={(value: unknown) => [`${value}%`, 'Avg Score']}
          />
          <Area
            type="monotone"
            dataKey="avgScore"
            stroke="#0033A0"
            strokeWidth={2}
            fill="#0033A0"
            fillOpacity={0.2}
            dot={(props) => <CustomDot key={props.payload?.date} {...props} />}
            activeDot={{ r: 6, stroke: '#0033A0', strokeWidth: 2, fill: 'white' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default React.memo(TimelineChart)
