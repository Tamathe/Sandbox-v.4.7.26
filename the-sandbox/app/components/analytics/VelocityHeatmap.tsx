'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from '../DynamicChart'
import { Activity } from 'lucide-react'

type WeekData = {
  weekLabel: string
  avgCognitiveLoad: number | null
  avgFrustration: number | null
  avgBloomLevel: number | null
  sessionCount: number
  observationCount: number
}

type Props = {
  courseId: string
  userEmail: string
}

function VelocityHeatmap({ courseId, userEmail }: Props) {
  const [weeks, setWeeks] = useState<WeekData[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/faculty/velocity-heatmap?courseId=${encodeURIComponent(courseId)}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setWeeks(d?.weeks ?? [])
        setLoading(false)
      })
      .catch(() => {
        setWeeks([])
        setLoading(false)
      })
  }, [courseId, userEmail])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 flex items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" />
      </div>
    )
  }

  if (!weeks || weeks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 flex flex-col items-center gap-3 text-center">
        <Activity className="size-10 text-gray-300" />
        <p className="font-semibold text-gray-500">No velocity data yet</p>
        <p className="text-sm text-gray-400 max-w-sm">
          Learning velocity data appears here as the Learning Observer classifies
          student sessions. Data covers the last 8 weeks.
        </p>
      </div>
    )
  }

  // Summary strip averages (ignore nulls)
  const avgBloom = useMemo(() => {
    const vals = weeks.map(w => w.avgBloomLevel).filter((v): v is number => v !== null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
  }, [weeks])
  const avgLoad = useMemo(() => {
    const vals = weeks.map(w => w.avgCognitiveLoad).filter((v): v is number => v !== null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—'
  }, [weeks])
  const avgFrustration = useMemo(() => {
    const vals = weeks.map(w => w.avgFrustration).filter((v): v is number => v !== null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—'
  }, [weeks])
  const totalSessions = useMemo(() => weeks.reduce((sum, w) => sum + w.sessionCount, 0), [weeks])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-1">Learning Velocity — Last 8 Weeks</h3>
        <p className="text-xs text-gray-400 mb-5">
          Class-level Bloom&apos;s level (bars), cognitive load, and frustration (lines) by week.
        </p>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={weeks} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
            {/* Left axis: Bloom 0–6 */}
            <YAxis
              yAxisId="bloom"
              domain={[0, 6]}
              tick={{ fontSize: 11 }}
              label={{ value: 'Bloom Level', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#94A3B8' } }}
            />
            {/* Right axis: Load / Frustration 0–1 */}
            <YAxis
              yAxisId="load"
              orientation="right"
              domain={[0, 1]}
              tick={{ fontSize: 11 }}
              tickFormatter={v => v.toFixed(1)}
              label={{ value: 'Load / Frustration', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 10, fill: '#94A3B8' } }}
            />
            <Tooltip
              formatter={(value, name) => {
                const v = typeof value === 'number' ? value : null
                if (name === 'Bloom Level') return [v != null ? v.toFixed(1) : '—', name]
                return [v != null ? v.toFixed(2) : '—', name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="bloom"
              dataKey="avgBloomLevel"
              name="Bloom Level"
              fill="#0033A0"
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="load"
              type="monotone"
              dataKey="avgCognitiveLoad"
              name="Cognitive Load"
              stroke="#FBBF24"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              yAxisId="load"
              type="monotone"
              dataKey="avgFrustration"
              name="Frustration"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary strip */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <span>
            <span className="font-semibold text-gray-700">Avg Bloom:</span> {avgBloom}
          </span>
          <span className="text-gray-300">·</span>
          <span>
            <span className="font-semibold text-gray-700">Avg Load:</span> {avgLoad}
          </span>
          <span className="text-gray-300">·</span>
          <span>
            <span className="font-semibold text-gray-700">Avg Frustration:</span> {avgFrustration}
          </span>
          <span className="text-gray-300">·</span>
          <span>
            <span className="font-semibold text-gray-700">{totalSessions}</span> sessions
          </span>
        </div>
      </div>

      {/* Scale reference */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-700 mb-2">Scale Reference</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500">
          <div>
            <span className="inline-block size-3 rounded-sm bg-[#0033A0] mr-1 align-middle" />
            <strong>Bloom Level</strong> — 1 (Remember) to 6 (Create). Higher = deeper cognitive engagement.
          </div>
          <div>
            <span className="inline-block w-3 h-0.5 bg-amber-400 mr-1 align-middle" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
            <strong>Cognitive Load</strong> — 0.0–1.0. &gt;0.7 signals overload; &lt;0.3 may indicate under-challenge.
          </div>
          <div>
            <span className="inline-block w-3 h-0.5 bg-red-400 mr-1 align-middle" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
            <strong>Frustration</strong> — 0.0–1.0. Sustained &gt;0.6 warrants early outreach.
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(VelocityHeatmap)
