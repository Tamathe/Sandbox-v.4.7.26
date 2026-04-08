'use client'

import React, { useMemo } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from '../../DynamicChart'

type DomainScores = {
  history: number
  exam: number
  differential: number
  plan: number
  communication: number
}

interface DomainRadarChartProps {
  scores: DomainScores
  previousScores?: DomainScores
  label?: string
}

const DOMAIN_LABELS: Record<string, string> = {
  history: 'History',
  exam: 'Exam',
  differential: 'Differential',
  plan: 'Plan',
  communication: 'Communication',
}

function DomainRadarChart({ scores, previousScores, label }: DomainRadarChartProps) {
  const data = useMemo(() => Object.entries(scores).map(([key, value]) => ({
    domain: DOMAIN_LABELS[key] ?? key,
    current: Math.round(value * 100) / 100,
    ...(previousScores ? { previous: Math.round(previousScores[key as keyof DomainScores] * 100) / 100 } : {}),
  })), [scores, previousScores])

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      {label && (
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">{label}</h3>
      )}
      <ResponsiveContainer width="100%" height={previousScores ? 290 : 260}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} angle={90} />
          {previousScores && (
            <Radar
              name="Previous"
              dataKey="previous"
              stroke="#d1d5db"
              fill="#d1d5db"
              fillOpacity={0.15}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          <Radar
            name="Current"
            dataKey="current"
            stroke="#0033A0"
            fill="#0033A0"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          {previousScores && <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default React.memo(DomainRadarChart)
