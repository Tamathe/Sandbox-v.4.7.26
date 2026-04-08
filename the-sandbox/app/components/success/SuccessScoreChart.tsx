'use client'

import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from '../DynamicChart'

interface HistoryPoint {
  id: string
  score: number
  trajectory: string
  computedAt: string
}

function SuccessScoreChart({ history }: { history: HistoryPoint[] }) {
  const data = useMemo(() => history.map(h => ({
    date: new Date(h.computedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: h.score,
    trajectory: h.trajectory,
  })), [history])

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={((value: number) => [`${value}/100`, 'Score']) as never}
            labelStyle={{ fontWeight: 600 }}
          />
          <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Healthy', fontSize: 10, fill: '#10b981' }} />
          <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Watch', fontSize: 10, fill: '#f59e0b' }} />
          <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Urgent', fontSize: 10, fill: '#ef4444' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0033A0"
            strokeWidth={2}
            dot={{ fill: '#0033A0', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default React.memo(SuccessScoreChart)
