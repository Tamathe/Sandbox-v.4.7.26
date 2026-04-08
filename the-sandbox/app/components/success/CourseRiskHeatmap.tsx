'use client'

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from '../DynamicChart'

interface Distribution {
  healthy: number
  watch: number
  concern: number
  urgent: number
  critical: number
}

const COLORS = {
  healthy: '#10b981',
  watch: '#eab308',
  concern: '#f59e0b',
  urgent: '#f97316',
  critical: '#ef4444',
}

const LABELS = {
  healthy: 'Healthy (70+)',
  watch: 'Watch (50-69)',
  concern: 'Concern (30-49)',
  urgent: 'Urgent (10-29)',
  critical: 'Critical (<10)',
}

function CourseRiskHeatmap({
  distribution,
  totalStudents,
  avgScore,
  avgDelta7d,
}: {
  distribution: Distribution
  totalStudents: number
  avgScore: number
  avgDelta7d: number
}) {
  const data = useMemo(() => Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value: count,
      color: COLORS[key as keyof typeof COLORS],
    })), [distribution])

  return (
    <div className="border rounded-2xl shadow-sm p-6">
      <h3 className="font-extrabold text-lg mb-4">Risk Distribution</h3>

      <div className="flex items-center gap-8">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={((value: number) => [`${value} students`, '']) as never} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {Object.entries(distribution).map(([key, count]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }}
              />
              <span className="text-sm text-gray-600 flex-1">
                {LABELS[key as keyof typeof LABELS]}
              </span>
              <span className="text-sm font-medium">{count}</span>
              <span className="text-xs text-gray-400">
                ({totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-6 border-t pt-4">
        <div>
          <span className="text-xs text-gray-500">Avg Score</span>
          <p className="text-lg font-bold">{avgScore}/100</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">7d Change</span>
          <p className={`text-lg font-bold ${avgDelta7d > 0 ? 'text-emerald-600' : avgDelta7d < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {avgDelta7d > 0 ? '+' : ''}{avgDelta7d}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Total Students</span>
          <p className="text-lg font-bold">{totalStudents}</p>
        </div>
      </div>
    </div>
  )
}

export default React.memo(CourseRiskHeatmap)
