'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useExpandableList } from '../CappedList'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from '../DynamicChart'
import { useAuth } from '../../lib/auth-context'

type CurriculumSignal = {
  concept: string
  sourceCourse: { id: string; code: string; name: string }
  targetCourse: { id: string; code: string; name: string }
  transferCount: number
  enrolledInTarget: number
  transferRate: number
  avgScore: number
  tier: 'strong' | 'notable'
}

type SortKey = 'transferRate' | 'transferCount' | 'avgScore' | 'concept'
type SortDir = 'asc' | 'desc'

function CurriculumSignalsSection() {
  const { currentUser } = useAuth()
  const [signals, setSignals] = useState<CurriculumSignal[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [conceptFilter, setConceptFilter] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'strong' | 'notable'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('transferRate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    fetch('/api/analytics/curriculum-signals', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { signals?: CurriculumSignal[]; totalEvents?: number }) => {
        setSignals(data.signals ?? [])
        setTotalEvents(data.totalEvents ?? 0)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [currentUser.email])

  const filtered = useMemo(() => {
    let result = signals
    if (conceptFilter.trim()) {
      const q = conceptFilter.toLowerCase()
      result = result.filter((s) => s.concept.toLowerCase().includes(q))
    }
    if (tierFilter !== 'all') {
      result = result.filter((s) => s.tier === tierFilter)
    }
    return [...result].sort((a, b) => {
      let va: string | number = 0
      let vb: string | number = 0
      if (sortKey === 'concept') { va = a.concept; vb = b.concept }
      else if (sortKey === 'transferRate') { va = a.transferRate; vb = b.transferRate }
      else if (sortKey === 'transferCount') { va = a.transferCount; vb = b.transferCount }
      else if (sortKey === 'avgScore') { va = a.avgScore; vb = b.avgScore }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [signals, conceptFilter, tierFilter, sortKey, sortDir])

  const { displayItems: displaySignals, expandRow: signalsExpandRow } = useExpandableList(filtered, 4, 'signals')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-[#0033A0] ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const chartData = useMemo(() => signals
    .slice()
    .sort((a, b) => b.transferRate - a.transferRate)
    .slice(0, 10)
    .map((s) => ({
      label: `${s.concept} (${s.sourceCourse.code}→${s.targetCourse.code})`,
      rate: Math.round(s.transferRate * 1000) / 10,
      tier: s.tier,
    })), [signals])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        Loading curriculum signals…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500">
        Failed to load curriculum signals.
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">No signals yet</p>
        <p className="text-sm">
          Transfer data accumulates as students complete tool sessions across multiple courses.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span><strong className="text-gray-800">{signals.length}</strong> pathways detected</span>
        <span><strong className="text-gray-800">{totalEvents}</strong> total transfer events</span>
        <span><strong className="text-gray-800">{signals.filter(s => s.tier === 'strong').length}</strong> strong signals</span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Top Transfer Pathways by Rate</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={220}
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.tier === 'strong' ? '#0033A0' : '#60A5FA'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-[#0033A0]" /> Strong signal
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-blue-400" /> Notable signal
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Filter by concept…"
          value={conceptFilter}
          onChange={(e) => setConceptFilter(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
        />
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as 'all' | 'strong' | 'notable')}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
        >
          <option value="all">All tiers</option>
          <option value="strong">Strong only</option>
          <option value="notable">Notable only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th
                className="px-4 py-3 font-semibold cursor-pointer hover:text-gray-800 select-none"
                onClick={() => toggleSort('concept')}
              >
                Concept <SortIcon k="concept" />
              </th>
              <th className="px-4 py-3 font-semibold">From</th>
              <th className="px-4 py-3 font-semibold">Into</th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer hover:text-gray-800 select-none text-right"
                onClick={() => toggleSort('transferCount')}
              >
                Students <SortIcon k="transferCount" />
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer hover:text-gray-800 select-none text-right"
                onClick={() => toggleSort('transferRate')}
              >
                Rate <SortIcon k="transferRate" />
              </th>
              <th
                className="px-4 py-3 font-semibold cursor-pointer hover:text-gray-800 select-none text-right"
                onClick={() => toggleSort('avgScore')}
              >
                Avg Score <SortIcon k="avgScore" />
              </th>
              <th className="px-4 py-3 font-semibold">Signal</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displaySignals.map((s, i) => {
              const ratePct = Math.round(s.transferRate * 100)
              const scorePct = Math.round(s.avgScore * 100)
              const subject = encodeURIComponent(
                `Curriculum Signal: "${s.concept}" transfer from ${s.sourceCourse.code} → ${s.targetCourse.code}`
              )
              const body = encodeURIComponent(
                `Hi,\n\nOur platform detected a strong concept transfer signal:\n\nConcept: ${s.concept}\nFrom: ${s.sourceCourse.code} (${s.sourceCourse.name})\nInto: ${s.targetCourse.code} (${s.targetCourse.name})\nTransfer rate: ${ratePct}%\nStudents: ${s.transferCount}\n\nThis suggests students entering your course already have exposure to this concept. You may want to adjust pacing or offer advanced content for this topic.\n\nBest,\nUniversity of Kentucky Analytics`
              )
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.concept}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {s.sourceCourse.code}
                    </span>
                    <span className="ml-1 text-gray-400 text-xs">{s.sourceCourse.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {s.targetCourse.code}
                    </span>
                    <span className="ml-1 text-gray-400 text-xs">{s.targetCourse.name}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{s.transferCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${ratePct >= 50 ? 'text-[#0033A0]' : 'text-amber-600'}`}
                    >
                      {ratePct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{scorePct}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.tier === 'strong'
                          ? 'bg-blue-100 text-[#0033A0]'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {s.tier === 'strong' ? 'Strong' : 'Notable'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:?subject=${subject}&body=${body}`}
                      className="text-xs text-[#0033A0] hover:underline whitespace-nowrap"
                    >
                      Notify educator →
                    </a>
                  </td>
                </tr>
              )
            })}
            {signalsExpandRow}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No signals match your filters.
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(CurriculumSignalsSection)
