'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from '../DynamicChart'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import { ChartPanel } from '../analytics/ChartPanel'
import type { WeeklyPulseData } from '../../lib/classroom-intelligence/types'

interface PulseHistoryChartProps {
  courseId: string
}

function PulseHistoryChart({ courseId }: PulseHistoryChartProps) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<WeeklyPulseData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetch_ = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(false)
    try {
      const res = await apiFetch<WeeklyPulseData[]>(
        currentUser.email,
        `/api/classroom-intelligence/pulse/${courseId}?weeks=12`,
      )
      setData(Array.isArray(res) ? res : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseId])

  useEffect(() => { fetch_() }, [fetch_])

  const chartData = useMemo(() => data.map((d) => ({
    week: `Week ${d.weekNumber}`,
    avgScore: d.avgScore !== null ? Math.round(d.avgScore) : null,
    submissionRate: d.submissionRate !== null ? Math.round(d.submissionRate * 100) : null,
    engagement: d.avgEngagement !== null ? Math.round(d.avgEngagement * 100) : null,
  })), [data])

  return (
    <ChartPanel
      title="Pulse History (12 Weeks)"
      icon={TrendingUp}
      loading={loading}
      error={error}
      isEmpty={chartData.length === 0}
      emptyMessage="No pulse history available"
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
          <Tooltip formatter={(v: any) => (v !== null ? `${v}%` : '—')} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="avgScore"
            name="Avg Score"
            stroke="#0033A0"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="submissionRate"
            name="Submission Rate"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="engagement"
            name="Engagement"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  )
}

export default React.memo(PulseHistoryChart)
