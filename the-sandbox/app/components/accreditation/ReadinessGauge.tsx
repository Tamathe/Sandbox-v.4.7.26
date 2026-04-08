'use client'

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell } from '../DynamicChart'

interface ReadinessGaugeProps {
  readiness: number // 0-1
  phase: string
  daysUntilSiteVisit: number | null
}

function ReadinessGauge({ readiness, phase, daysUntilSiteVisit }: ReadinessGaugeProps) {
  const pct = Math.round(readiness * 100)
  const data = useMemo(() => [
    { value: pct },
    { value: 100 - pct },
  ], [pct])
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <PieChart width={180} height={180}>
          <Pie
            data={data}
            cx={90}
            cy={90}
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-gray-900">{pct}%</span>
          <span className="text-xs text-gray-500">Ready</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          {phase.replace('_', ' ')}
        </span>
        {daysUntilSiteVisit !== null && daysUntilSiteVisit > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {daysUntilSiteVisit} days until site visit
          </p>
        )}
      </div>
    </div>
  )
}

export default React.memo(ReadinessGauge)
