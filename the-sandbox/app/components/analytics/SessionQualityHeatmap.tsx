'use client'

import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type ToolQuality = {
  toolId: string
  toolName: string
  sessionCount: number
  avgScore: number | null
  avgDurationMinutes: number | null
  completionRate: number | null
}

type Props = {
  courseId: string
  userEmail: string
}

function ScoreChip({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        —
      </span>
    )
  }
  const pct = Math.round(value * 100)
  const color =
    value >= 0.7
      ? 'bg-green-100 text-green-700'
      : value >= 0.4
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {pct}%
    </span>
  )
}

export default function SessionQualityHeatmap({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ tools: ToolQuality[] }>(
    `/api/analytics/faculty/session-quality?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )
  const [showAll, setShowAll] = useState(false)

  const tools = data?.tools ?? null

  return (
    <ChartPanel
      title="Session Quality"
      subtitle={tools != null ? `${tools.length} tool${tools.length !== 1 ? 's' : ''}` : undefined}
      icon={BarChart2}
      loading={loading}
      error={error}
      errorMessage="Failed to load session quality data."
      isEmpty={tools != null && tools.length === 0}
      emptyMessage="No tools linked to this course yet."
    >
      {tools && tools.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tool
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Sessions
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Avg Score
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Avg Duration
                </th>
                <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Completion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(showAll ? tools : tools.slice(0, 4)).map(tool => (
                <tr key={tool.toolId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-gray-900 max-w-[180px] truncate">
                    {tool.toolName}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">
                    {tool.sessionCount}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <ScoreChip value={tool.avgScore} />
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">
                    {tool.avgDurationMinutes != null ? `${tool.avgDurationMinutes}m` : '—'}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <ScoreChip value={tool.completionRate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!showAll && tools.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show all {tools.length} tools
            </button>
          )}
        </div>
      )}
    </ChartPanel>
  )
}
