'use client'

import dynamic from 'next/dynamic'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DrillHistoryEntry } from '../../../lib/crisis-comms/spokesperson-trainer/types'

const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false, loading: () => <Loader2 className="size-6 text-gray-300 animate-spin mx-auto" /> },
)
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false })
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false },
)

interface DrillHistoryProps {
  entries: DrillHistoryEntry[]
  loading?: boolean
}

function computeTrend(entries: DrillHistoryEntry[]): {
  direction: 'up' | 'down' | 'flat'
  delta: string
  bestDimension: string
  weakestDimension: string
} {
  if (entries.length < 2) {
    return { direction: 'flat', delta: '0.0', bestDimension: '-', weakestDimension: '-' }
  }

  // Compare latest vs first (oldest)
  const reversed = [...entries].reverse()
  const latest = reversed[reversed.length - 1].scores
  const first = reversed[0].scores

  const avgLatest = (latest.clarity + latest.empathy + latest.speculationControl + latest.messageDiscipline) / 4
  const avgFirst = (first.clarity + first.empathy + first.speculationControl + first.messageDiscipline) / 4
  const delta = avgLatest - avgFirst

  // Find best/weakest across all drills (average per dimension)
  const sums = { clarity: 0, empathy: 0, speculationControl: 0, messageDiscipline: 0 }
  for (const e of entries) {
    sums.clarity += e.scores.clarity
    sums.empathy += e.scores.empathy
    sums.speculationControl += e.scores.speculationControl
    sums.messageDiscipline += e.scores.messageDiscipline
  }
  const n = entries.length
  const avgs: Record<string, number> = {
    Clarity: sums.clarity / n,
    Empathy: sums.empathy / n,
    'Spec. Control': sums.speculationControl / n,
    'Msg Discipline': sums.messageDiscipline / n,
  }

  const sorted = Object.entries(avgs).sort(([, a], [, b]) => b - a)

  return {
    direction: delta > 0.3 ? 'up' : delta < -0.3 ? 'down' : 'flat',
    delta: Math.abs(delta).toFixed(1),
    bestDimension: sorted[0][0],
    weakestDimension: sorted[sorted.length - 1][0],
  }
}

export default function DrillHistory({ entries, loading }: DrillHistoryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-6 text-[#0033A0] animate-spin" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm bg-white p-6 text-center">
        <p className="text-sm text-gray-500">No completed drills yet. Finish your first drill to see your progress here.</p>
      </div>
    )
  }

  const chartData = [...entries]
    .reverse()
    .map((e, i) => {
      const avg = (e.scores.clarity + e.scores.empathy + e.scores.speculationControl + e.scores.messageDiscipline) / 4
      return {
        name: `#${i + 1}`,
        clarity: e.scores.clarity,
        empathy: e.scores.empathy,
        speculation: e.scores.speculationControl,
        discipline: e.scores.messageDiscipline,
        average: parseFloat(avg.toFixed(1)),
        scenario: e.scenarioTitle,
      }
    })

  const trend = computeTrend(entries)
  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus
  const trendColor = trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Score Trends</h3>

      {/* Trend summary strip */}
      {entries.length >= 2 && (
        <div className="flex items-center gap-4 text-xs bg-gray-50 rounded-lg px-3 py-2">
          <div className={`flex items-center gap-1 font-medium ${trendColor}`}>
            <TrendIcon className="size-3.5" />
            <span>{trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.delta} avg</span>
          </div>
          <div className="text-gray-500">
            Best: <span className="font-medium text-green-700">{trend.bestDimension}</span>
          </div>
          <div className="text-gray-500">
            Weakest: <span className="font-medium text-red-600">{trend.weakestDimension}</span>
          </div>
        </div>
      )}

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload
                return item?.scenario ? `${label} — ${item.scenario}` : label
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="average" stroke="#374151" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4 }} name="average" />
            <Line type="monotone" dataKey="clarity" stroke="#0033A0" strokeWidth={1.5} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="empathy" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="speculation" name="speculation ctrl" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey="discipline" name="msg discipline" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2.5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Session list */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {entries.map((e) => {
          const avg = (e.scores.clarity + e.scores.empathy + e.scores.speculationControl + e.scores.messageDiscipline) / 4
          const diffColor =
            e.difficulty === 'warmup' ? 'bg-emerald-100 text-emerald-700' :
            e.difficulty === 'hostile' ? 'bg-red-100 text-red-700' :
            e.difficulty === 'press-conference' ? 'bg-purple-100 text-purple-700' :
            'bg-blue-100 text-blue-700'
          return (
            <div key={e.sessionId} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">{e.scenarioTitle}</span>
                <span className={`px-1.5 py-0.5 rounded-full font-medium ${diffColor}`}>
                  {e.difficulty === 'press-conference' ? 'press conf.' : e.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{avg.toFixed(1)}/10</span>
                <span className="text-gray-400">
                  {new Date(e.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
