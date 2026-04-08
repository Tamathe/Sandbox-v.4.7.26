'use client'

import React, { useMemo } from 'react'
import { Zap } from 'lucide-react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from '../DynamicChart'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type ToolPoint = {
  toolId: string
  toolName: string
  difficultyLevel: string
  avgScore: number | null
  sessionCount: number
  completionRate: number | null
}

type Props = {
  courseId: string
  userEmail: string
}

const DIFFICULTY_MAP: Record<string, number> = {
  Introductory: 1,
  Intermediate: 2,
  Advanced: 3,
}

function scoreColor(score: number | null): string {
  if (score === null) return '#9ca3af'
  if (score >= 0.7) return '#22c55e'
  if (score >= 0.4) return '#f59e0b'
  return '#ef4444'
}

type CustomDotProps = {
  cx?: number
  cy?: number
  payload?: ToolPoint
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null
  const count = payload.sessionCount
  const r = Math.max(6, Math.min(18, 4 + count * 1.5))
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={scoreColor(payload.avgScore)}
      fillOpacity={0.8}
      stroke="#fff"
      strokeWidth={1.5}
    />
  )
}

type TooltipPayloadEntry = { payload: ToolPoint }

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const score = d.avgScore !== null ? `${Math.round(d.avgScore * 100)}%` : 'No data'
  const completion =
    d.completionRate !== null ? `${Math.round(d.completionRate * 100)}%` : 'No data'
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-3 text-sm max-w-52">
      <p className="font-semibold text-gray-900 mb-1 leading-snug">{d.toolName}</p>
      <p className="text-gray-500 text-xs mb-2">{d.difficultyLevel}</p>
      <div className="space-y-0.5 text-xs">
        <p><span className="text-gray-500">Avg score:</span> <span className="font-medium">{score}</span></p>
        <p><span className="text-gray-500">Completion:</span> <span className="font-medium">{completion}</span></p>
        <p><span className="text-gray-500">Sessions:</span> <span className="font-medium">{d.sessionCount}</span></p>
      </div>
    </div>
  )
}

function DifficultyOutcomeChart({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ tools: ToolPoint[] }>(
    `/api/analytics/faculty/difficulty-outcome?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )

  const tools = data?.tools ?? null

  const chartData = useMemo(() => (tools ?? []).map(t => ({
    ...t,
    x: DIFFICULTY_MAP[t.difficultyLevel] ?? 1,
    y: t.avgScore !== null ? Math.round(t.avgScore * 100) : 0,
  })), [tools])

  return (
    <ChartPanel
      title="Difficulty vs. Outcome"
      icon={Zap}
      loading={loading}
      error={error}
      errorMessage="Failed to load data."
      isEmpty={tools?.length === 0}
      emptyMessage="No tools linked to this course yet."
    >
      {chartData.length > 0 && (
        <>
          <p className="text-xs text-gray-400 -mt-3 mb-5">
            Tool performance by difficulty level — dot size reflects session volume
          </p>

          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0.5, 3.5]}
                ticks={[1, 2, 3]}
                tickFormatter={v =>
                  v === 1 ? 'Introductory' : v === 2 ? 'Intermediate' : 'Advanced'
                }
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 11 }}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={chartData} shape={<CustomDot />}>
                {chartData.map(entry => (
                  <Cell key={entry.toolId} fill={scoreColor(entry.avgScore)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-green-500" />
              ≥ 70% avg score
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-amber-500" />
              40–69%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-red-500" />
              &lt; 40%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full bg-gray-400" />
              No score data
            </span>
          </div>
        </>
      )}
    </ChartPanel>
  )
}

export default React.memo(DifficultyOutcomeChart)
