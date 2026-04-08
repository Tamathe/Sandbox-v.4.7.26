'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Loader2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '../DynamicChart'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeiStudent {
  id: string
  studentId: string
  meiScore: number
  durationTrend: number
  scoreTrend: number
  hintIndependence: number
  reformulationDecline: number
  bloomCeiling: number
  sessionsAnalyzed: number
  computedAt: string
  student: { id: string; name: string; email: string }
}

interface MeiAggregates {
  totalStudents: number
  scoredStudents: number
  avgMeiScore: number | null
  medianMeiScore: number | null
  avgDurationTrend: number | null
  avgScoreTrend: number | null
  avgHintIndependence: number | null
  avgReformulationDecline: number | null
  avgBloomCeiling: number | null
}

interface MeiDashboardProps {
  assignmentId: string
  authHeaders: Record<string, string>
  scores: MeiStudent[]
  aggregates: MeiAggregates
  onRefresh: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'meiScore' | 'durationTrend' | 'scoreTrend' | 'hintIndependence' | 'reformulationDecline' | 'bloomCeiling' | 'sessionsAnalyzed' | 'computedAt'

function meiColorClass(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function meiBgClass(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function fmt(n: number | null) {
  return n != null ? n.toFixed(1) : '—'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeiDashboard({
  assignmentId,
  authHeaders,
  scores,
  aggregates,
  onRefresh,
}: MeiDashboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('meiScore')
  const [sortAsc, setSortAsc] = useState(false)
  const [recomputing, setRecomputing] = useState(false)

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...scores]
    arr.sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortKey === 'name') {
        av = a.student.name?.toLowerCase() ?? ''
        bv = b.student.name?.toLowerCase() ?? ''
      } else if (sortKey === 'computedAt') {
        av = new Date(a.computedAt).getTime()
        bv = new Date(b.computedAt).getTime()
      } else {
        av = a[sortKey]
        bv = b[sortKey]
      }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return arr
  }, [scores, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name') // name defaults ascending, numbers descending
    }
  }

  // ── Histogram bins ────────────────────────────────────────────────────────
  const histogram = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}–${i * 10 + 9}`,
      count: 0,
    }))
    for (const s of scores) {
      const idx = Math.min(9, Math.floor(s.meiScore / 10))
      bins[idx].count++
    }
    return bins
  }, [scores])

  // ── Recompute ─────────────────────────────────────────────────────────────
  async function handleRecompute() {
    setRecomputing(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/mei`, {
        method: 'POST',
        headers: authHeaders,
      })
      if (res.ok) onRefresh()
    } finally {
      setRecomputing(false)
    }
  }

  const dims: { key: Exclude<SortKey, 'name' | 'computedAt' | 'sessionsAnalyzed' | 'meiScore'>; label: string; aggKey: keyof MeiAggregates }[] = [
    { key: 'durationTrend', label: 'Duration', aggKey: 'avgDurationTrend' },
    { key: 'scoreTrend', label: 'Score Trend', aggKey: 'avgScoreTrend' },
    { key: 'hintIndependence', label: 'Hint Indep.', aggKey: 'avgHintIndependence' },
    { key: 'reformulationDecline', label: 'Reformulation', aggKey: 'avgReformulationDecline' },
    { key: 'bloomCeiling', label: 'Bloom Ceiling', aggKey: 'avgBloomCeiling' },
  ]

  return (
    <div className="space-y-6">
      {/* ── Class Averages Strip ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Class Averages</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div>
            <p className="text-xs text-gray-500">Overall MEI</p>
            <p className={`text-lg font-extrabold ${aggregates.avgMeiScore != null ? meiColorClass(aggregates.avgMeiScore) : 'text-gray-400'}`}>
              {fmt(aggregates.avgMeiScore)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Median</p>
            <p className="text-lg font-extrabold text-gray-900">{fmt(aggregates.medianMeiScore)}</p>
          </div>
          {dims.map((d) => (
            <div key={d.key}>
              <p className="text-xs text-gray-500">{d.label}</p>
              <p className="text-lg font-extrabold text-gray-900">
                {fmt(aggregates[d.aggKey] as number | null)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {aggregates.scoredStudents} of {aggregates.totalStudents} students scored
        </p>
      </div>

      {/* ── Student Table ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Student Scores</h3>
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002680] transition-colors disabled:opacity-50"
          >
            {recomputing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Recompute All
          </button>
        </div>

        {scores.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No MEI scores computed yet. Click "Recompute All" to generate scores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {([
                    ['name', 'Name'],
                    ['meiScore', 'MEI Score'],
                    ['durationTrend', 'Duration'],
                    ['scoreTrend', 'Score Trend'],
                    ['hintIndependence', 'Hint Indep.'],
                    ['reformulationDecline', 'Reformulation'],
                    ['bloomCeiling', 'Bloom'],
                    ['sessionsAnalyzed', 'Sessions'],
                    ['computedAt', 'Last Computed'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-3 py-2.5 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                      onClick={() => toggleSort(key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <ArrowUpDown className={`size-3 ${sortKey === key ? 'text-[#0033A0]' : 'text-gray-300'}`} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900">{s.student.name}</p>
                      <p className="text-gray-400">{s.student.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${meiBgClass(s.meiScore)}`}>
                        {s.meiScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{s.durationTrend.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{s.scoreTrend.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{s.hintIndependence.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{s.reformulationDecline.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{s.bloomCeiling.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-center">{s.sessionsAnalyzed}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                      {format(new Date(s.computedAt), 'MMM d, h:mm a')}
                    </td>
                  </tr>
                ))}

                {/* Class averages row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2.5 text-gray-600">Class Average</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${aggregates.avgMeiScore != null ? meiBgClass(aggregates.avgMeiScore) : 'bg-gray-100 text-gray-500'}`}>
                      {fmt(aggregates.avgMeiScore)}
                    </span>
                  </td>
                  {dims.map((d) => (
                    <td key={d.key} className="px-3 py-2.5 text-gray-600">
                      {fmt(aggregates[d.aggKey] as number | null)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-gray-400 text-center">—</td>
                  <td className="px-3 py-2.5 text-gray-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Score Distribution Histogram ──────────────────────────────────── */}
      {scores.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histogram} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" name="Students" fill="#0033A0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
