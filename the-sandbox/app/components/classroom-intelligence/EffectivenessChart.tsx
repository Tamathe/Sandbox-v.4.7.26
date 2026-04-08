'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from '../DynamicChart'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import { ChartPanel } from '../analytics/ChartPanel'
import type { InterventionEffectiveness } from '../../lib/classroom-intelligence/types'

const UK_BLUE = '#0033A0'

interface EffectivenessChartProps {
  courseId: string
}

function EffectivenessChart({ courseId }: EffectivenessChartProps) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<InterventionEffectiveness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetch_ = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(false)
    try {
      const res = await apiFetch<InterventionEffectiveness[]>(
        currentUser.email,
        `/api/classroom-intelligence/effectiveness?courseId=${courseId}`,
      )
      setData(res)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseId])

  useEffect(() => { fetch_() }, [fetch_])

  const chartData = useMemo(() => data.map((d) => ({
    name: d.approach.replace(/_/g, ' '),
    rate: d.totalUsed > 0 ? Math.round((d.effective / d.totalUsed) * 100) : 0,
    effectSize: d.avgEffectSize ?? 0,
    total: d.totalUsed,
  })), [data])

  const bestIdx = useMemo(() => chartData.reduce(
    (best, cur, i) => (cur.rate > (chartData[best]?.rate ?? 0) ? i : best),
    0,
  ), [chartData])

  return (
    <ChartPanel
      title="Intervention Effectiveness"
      icon={BarChart3}
      loading={loading}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No intervention data yet"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 48, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: any, name: any) =>
              name === 'rate' ? [`${value}%`, 'Effectiveness'] : [Number(value).toFixed(2), 'Avg Effect Size']
            }
            labelFormatter={(label: any) => label}
          />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={i === bestIdx ? '#16a34a' : UK_BLUE}
                opacity={i === bestIdx ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {chartData[bestIdx] && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Best approach: <span className="font-extrabold text-green-700">{chartData[bestIdx].name}</span>
          {' '}({chartData[bestIdx].rate}% effective, effect size {chartData[bestIdx].effectSize.toFixed(2)})
        </p>
      )}
    </ChartPanel>
  )
}

export default React.memo(EffectivenessChart)
