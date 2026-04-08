'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from './DynamicChart'
import { AlertTriangle, TrendingUp, Brain } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BloomToolData {
  toolId: string
  toolName: string
  levels: Record<number, number>
  totalWithBloom: number
}

export interface BloomCoverageData {
  courseId: string
  byTool: BloomToolData[]
  courseSummary: Record<number, number>
  bloomLabels: Record<number, string>
  dominantLevel: number | null
  dominantSince: string | null
  gapAlert: boolean
  coverage: number
  totalSessions: number
  applyOrHigherCount: number
}

interface Props {
  data: BloomCoverageData
}

// ── Bloom level color palette ──────────────────────────────────────────────────

const BLOOM_COLORS: Record<number, string> = {
  1: '#94A3B8', // slate-400 — Remember
  2: '#60A5FA', // blue-400  — Understand
  3: '#34D399', // emerald-400 — Apply
  4: '#FBBF24', // amber-400 — Analyze
  5: '#F97316', // orange-400 — Evaluate
  6: '#A78BFA', // violet-400 — Create
}

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-gray-900 mb-2 max-w-40 truncate">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .reverse()
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span
              className="inline-block size-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: p.fill }}
            />
            <span className="text-gray-700">{p.name}:</span>
            <span className="font-semibold ml-auto pl-3">{p.value}</span>
            <span className="text-gray-400">
              ({total > 0 ? Math.round((p.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      <div className="border-t border-gray-100 mt-2 pt-1 flex justify-between text-gray-500">
        <span>Total</span>
        <span className="font-semibold">{total}</span>
      </div>
    </div>
  )
}

// ── Course summary donut-style mini bars ──────────────────────────────────────

function CourseSummaryBar({
  courseSummary,
  totalSessions,
}: {
  courseSummary: Record<number, number>
  totalSessions: number
}) {
  if (totalSessions === 0) return null

  return (
    <div className="flex h-4 rounded-full overflow-hidden w-full">
      {[1, 2, 3, 4, 5, 6].map((level) => {
        const count = courseSummary[level] ?? 0
        if (count === 0) return null
        const pct = (count / totalSessions) * 100
        return (
          <div
            key={level}
            style={{ width: `${pct}%`, backgroundColor: BLOOM_COLORS[level] }}
            title={`${BLOOM_LABELS[level]}: ${count} sessions (${Math.round(pct)}%)`}
          />
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BloomCoverageChart({ data }: Props) {
  const {
    byTool,
    courseSummary,
    dominantLevel,
    gapAlert,
    coverage,
    totalSessions,
    applyOrHigherCount,
  } = data

  if (totalSessions === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Brain className="size-10 text-gray-300" />
        <p className="font-semibold text-gray-500">No Bloom&apos;s data yet</p>
        <p className="text-sm text-gray-400 max-w-sm">
          Session Bloom&apos;s levels will appear here once the Learning Observer has processed
          enough turns. Data accumulates automatically — no setup required.
        </p>
      </div>
    )
  }

  // Prepare stacked bar chart data — one entry per tool
  const chartData = byTool.map((tool) => ({
    name: tool.toolName.length > 20 ? tool.toolName.slice(0, 18) + '…' : tool.toolName,
    fullName: tool.toolName,
    Remember: tool.levels[1] ?? 0,
    Understand: tool.levels[2] ?? 0,
    Apply: tool.levels[3] ?? 0,
    Analyze: tool.levels[4] ?? 0,
    Evaluate: tool.levels[5] ?? 0,
    Create: tool.levels[6] ?? 0,
  }))

  const coveragePct = Math.round(coverage * 100)

  return (
    <div className="space-y-5">
      {/* Gap alert banner */}
      {gapAlert && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <AlertTriangle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm">Learning Depth Gap Detected</p>
            <p className="text-xs text-red-600 mt-0.5">
              No sessions have reached <strong>Apply (Level 3)</strong> or higher in the past 7 days.
              Your students are primarily recalling and recognizing information — consider adding
              activities that require application, analysis, or creation.
            </p>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium">Sessions with Bloom Data</p>
          <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
          <p className="text-xs text-gray-400">across all tools</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium">Apply or Higher</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-gray-900">{coveragePct}%</p>
            <p className="text-xs text-gray-400">({applyOrHigherCount} sessions)</p>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp
              className={`size-3.5 ${coveragePct >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}
            />
            <p className={`text-xs font-medium ${coveragePct >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {coveragePct >= 30 ? 'Good depth coverage' : 'Below 30% target'}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium">Dominant Level</p>
          {dominantLevel ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-sm"
                  style={{ backgroundColor: BLOOM_COLORS[dominantLevel] }}
                />
                <p className="text-2xl font-bold text-gray-900">{BLOOM_LABELS[dominantLevel]}</p>
              </div>
              <p className="text-xs text-gray-400">Level {dominantLevel} of 6</p>
            </>
          ) : (
            <p className="text-xl font-bold text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Course-level color bar */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <p className="text-sm font-bold text-gray-900 mb-3">Course Bloom&apos;s Distribution</p>
        <CourseSummaryBar courseSummary={courseSummary} totalSessions={totalSessions} />
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {[1, 2, 3, 4, 5, 6].map((level) => {
            const count = courseSummary[level] ?? 0
            if (count === 0) return null
            return (
              <div key={level} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ backgroundColor: BLOOM_COLORS[level] }}
                />
                <span>
                  L{level} {BLOOM_LABELS[level]} ({count})
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stacked bar chart — per tool */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <p className="text-sm font-bold text-gray-900 mb-1">Bloom&apos;s Level by Tool</p>
          <p className="text-xs text-gray-400 mb-4">Sessions stacked by cognitive demand level</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
              barSize={32}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="square"
                iconSize={10}
              />
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <Bar
                  key={level}
                  dataKey={BLOOM_LABELS[level]}
                  stackId="bloom"
                  fill={BLOOM_COLORS[level]}
                  radius={level === 6 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
