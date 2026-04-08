'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '../../components/DynamicChart'
import { format } from 'date-fns'

type TrendDay = { date: string; tos: number; consent: number; ferpa: number }

export function ComplianceTrendChart({ trends }: { trends: TrendDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trends}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => format(new Date(v + 'T00:00:00'), 'MMM d')}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(v) => format(new Date(String(v) + 'T00:00:00'), 'MMM d, yyyy')}
        />
        <Legend />
        <Area type="monotone" dataKey="tos" name="TOS" stroke="#0033A0" fill="#0033A0" fillOpacity={0.15} strokeWidth={2} />
        <Area type="monotone" dataKey="consent" name="Data Consent" stroke="#059669" fill="#059669" fillOpacity={0.1} strokeWidth={2} />
        <Area type="monotone" dataKey="ferpa" name="FERPA" stroke="#D97706" fill="#D97706" fillOpacity={0.1} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
