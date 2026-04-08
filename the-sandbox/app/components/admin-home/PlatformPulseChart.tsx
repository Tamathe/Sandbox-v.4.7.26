'use client'

import React from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from '../DynamicChart'
import type { DailyMetric } from './useAdminHome'

function PlatformPulseChartInner({ usageTrend }: { usageTrend: DailyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={usageTrend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0033A0" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#0033A0" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="grad-sessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }} />
        <Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#0033A0" strokeWidth={2} fill="url(#grad-users)" />
        <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#10b981" strokeWidth={2} fill="url(#grad-sessions)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const PlatformPulseChart = React.memo(PlatformPulseChartInner)
