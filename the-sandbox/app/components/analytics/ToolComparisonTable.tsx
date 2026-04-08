'use client'

import { useState } from 'react'
import { BarChart2, ChevronUp, ChevronDown } from 'lucide-react'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type ToolComparisonRow = {
  toolId: string
  toolName: string
  toolType: string
  difficultyLevel: string
  sessionCount: number
  uniqueStudents: number
  avgScore: number | null
  completionRate: number | null
  avgDurationMinutes: number | null
}

type SortKey = keyof Omit<ToolComparisonRow, 'toolId' | 'toolName' | 'toolType' | 'difficultyLevel'>

type Props = {
  courseId: string
  userEmail: string
}

function ScoreChip({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">—</span>
  }
  const pct = Math.round(value * 100)
  const cls =
    pct >= 70
      ? 'bg-green-50 text-green-700 border border-green-200'
      : pct >= 40
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-red-50 text-red-700 border border-red-200'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{pct}%</span>
  )
}

function DifficultyBadge({ level }: { level: string }) {
  const cls =
    level === 'Advanced'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : level === 'Intermediate'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{level}</span>
  )
}

const COLUMNS: { key: SortKey | 'toolName' | 'toolType' | 'difficultyLevel'; label: string; sortable: boolean }[] = [
  { key: 'toolName', label: 'Tool Name', sortable: false },
  { key: 'toolType', label: 'Type', sortable: false },
  { key: 'difficultyLevel', label: 'Difficulty', sortable: false },
  { key: 'sessionCount', label: 'Sessions', sortable: true },
  { key: 'uniqueStudents', label: 'Students', sortable: true },
  { key: 'avgScore', label: 'Avg Score', sortable: true },
  { key: 'completionRate', label: 'Completion', sortable: true },
  { key: 'avgDurationMinutes', label: 'Avg Duration', sortable: true },
]

export default function ToolComparisonTable({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ tools: ToolComparisonRow[] }>(
    `/api/analytics/faculty/tool-comparison?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )
  const [sortKey, setSortKey] = useState<SortKey>('sessionCount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rows = data?.tools ?? []

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity
    const bv = b[sortKey] ?? -Infinity
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  return (
    <ChartPanel
      title="Tool Comparison"
      icon={BarChart2}
      loading={loading}
      error={error}
      isEmpty={rows.length === 0}
      emptyMessage="No tools linked to this course yet."
      headerRight={!loading && !error ? <span className="ml-auto text-xs text-gray-400">{rows.length} tool{rows.length !== 1 ? 's' : ''}</span> : undefined}
    >
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`text-left py-2 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap select-none ${
                      col.sortable ? 'cursor-pointer hover:text-gray-800' : ''
                    }`}
                    onClick={col.sortable ? () => handleSort(col.key as SortKey) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === 'asc'
                          ? <ChevronUp className="size-3" />
                          : <ChevronDown className="size-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(row => (
                <tr key={row.toolId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-900 max-w-[180px] truncate" title={row.toolName}>
                    {row.toolName}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                    {row.toolType.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3">
                    <DifficultyBadge level={row.difficultyLevel} />
                  </td>
                  <td className="py-2.5 px-3 text-gray-700 text-center font-medium">
                    {row.sessionCount}
                  </td>
                  <td className="py-2.5 px-3 text-gray-700 text-center">
                    {row.uniqueStudents}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <ScoreChip value={row.avgScore} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <ScoreChip value={row.completionRate} />
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 text-center text-xs">
                    {row.avgDurationMinutes !== null ? `${row.avgDurationMinutes} min` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartPanel>
  )
}
