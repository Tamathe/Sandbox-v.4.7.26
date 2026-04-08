'use client'

import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from '../DynamicChart'
import type { CrossSectionInsight } from '../../lib/classroom-intelligence/types'

const UK_BLUE = '#0033A0'

interface CrossSectionDetailProps {
  insight: CrossSectionInsight
}

function CrossSectionDetail({ insight }: CrossSectionDetailProps) {
  const chartData = useMemo(() => insight.sections.map((s) => ({
    section: s.label,
    mastery: Math.round(s.masteryRate * 100),
    students: s.studentCount,
    approach: s.approach ? s.approach.replace(/_/g, ' ') : 'None',
  })), [insight.sections])

  const bestMastery = useMemo(() => Math.max(...chartData.map((d) => d.mastery)), [chartData])

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
      <div>
        <h3 className="font-extrabold text-lg text-gray-900">{insight.concept}</h3>
        <p className="text-xs text-gray-500 mt-1">
          Spread: {Math.round(insight.spread * 100)}%
          {insight.isSignificant && (
            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
              SIGNIFICANT
            </span>
          )}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="section" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
          <Tooltip
            formatter={(value: any) => [`${value}%`, 'Mastery']}
            labelFormatter={(label: any) => `Section ${label}`}
          />
          <Bar dataKey="mastery" radius={[6, 6, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.mastery === bestMastery ? '#16a34a' : UK_BLUE}
                opacity={d.mastery === bestMastery ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Approach badges */}
      <div className="flex flex-wrap gap-2">
        {chartData.map((d) => (
          <span
            key={d.section}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              d.mastery === bestMastery
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}
          >
            <span className="font-extrabold">{d.section}</span>
            <span className="text-gray-400">|</span>
            {d.approach}
            <span className="text-gray-400">({d.students} students)</span>
          </span>
        ))}
      </div>

      {insight.bestApproach && (
        <p className="text-xs text-gray-500">
          Best approach overall: <span className="font-extrabold text-[#0033A0]">{insight.bestApproach.replace(/_/g, ' ')}</span>
        </p>
      )}
    </div>
  )
}

export default React.memo(CrossSectionDetail)
