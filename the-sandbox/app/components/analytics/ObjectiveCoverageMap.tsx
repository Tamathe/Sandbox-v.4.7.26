'use client'

import { useState } from 'react'
import { Target } from 'lucide-react'
import { useChartData } from '../../hooks/useChartData'
import { ChartPanel } from './ChartPanel'

type ObjectiveRow = {
  objectiveId: string
  title: string
  attemptCount: number
  masteredCount: number
  totalEnrolled: number
  avgMastery: number | null
  coverageRate: number
}

type Props = {
  courseId: string
  userEmail: string
}

function MasteryChip({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 flex-shrink-0">
        No data
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
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${color}`}>
      {pct}% mastery
    </span>
  )
}

export default function ObjectiveCoverageMap({ courseId, userEmail }: Props) {
  const { data, loading, error } = useChartData<{ objectives: ObjectiveRow[] }>(
    `/api/analytics/faculty/objective-coverage?courseId=${encodeURIComponent(courseId)}`,
    { 'x-demo-user-email': userEmail }
  )
  const [showAll, setShowAll] = useState(false)

  const objectives = data?.objectives ?? null

  return (
    <ChartPanel
      title="Objective Coverage"
      subtitle={objectives != null ? `${objectives.length} objective${objectives.length !== 1 ? 's' : ''}` : undefined}
      icon={Target}
      loading={loading}
      error={error}
      errorMessage="Failed to load objective data."
      isEmpty={objectives != null && objectives.length === 0}
      emptyMessage="No learning objectives set for this course yet."
    >
      {objectives && objectives.length > 0 && (
        <div className="space-y-4">
          {(showAll ? objectives : objectives.slice(0, 4)).map(obj => (
            <div key={obj.objectiveId}>
              {/* Top row: title + mastery chip */}
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="text-sm font-medium text-gray-800 truncate" title={obj.title}>
                  {obj.title}
                </p>
                <MasteryChip value={obj.avgMastery} />
              </div>

              {/* Coverage bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0033A0] rounded-full transition-all"
                    style={{ width: `${Math.round(obj.coverageRate * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 w-28 text-right">
                  {obj.attemptCount}/{obj.totalEnrolled} attempted
                </span>
              </div>

              {/* Mastered note */}
              <p className="text-[11px] text-gray-400 mt-0.5">
                {obj.masteredCount} mastered
              </p>
            </div>
          ))}
          {!showAll && objectives.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show all {objectives.length} objectives
            </button>
          )}
        </div>
      )}
    </ChartPanel>
  )
}
