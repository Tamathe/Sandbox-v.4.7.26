'use client'

import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'

type GapEntry = {
  objectiveId: string
  title: string
  coverageRatio: number
  avgMastery: number
  notAttemptedCount: number
  enrolledCount: number
}

type Props = {
  courseId: string
  userEmail: string
}

export default function CurriculumGapPanel({ courseId, userEmail }: Props) {
  const [gaps, setGaps] = useState<GapEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/analytics/curriculum-gaps?courseId=${encodeURIComponent(courseId)}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { gaps: GapEntry[] }) => {
        setGaps(data.gaps)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [courseId, userEmail])

  const allCovered = gaps != null && gaps.length > 0 && gaps.every(g => g.coverageRatio >= 0.7)

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="size-4 text-[#0033A0]" />
        <h3 className="font-semibold text-gray-900">Curriculum Gaps</h3>
        {gaps != null && (
          <span className="ml-auto text-xs text-gray-400">
            {gaps.length} objective{gaps.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="size-5 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center py-4">Failed to load curriculum gaps.</p>
      )}

      {!loading && !error && gaps != null && gaps.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">No objectives configured for this course yet.</p>
      )}

      {!loading && !error && allCovered && (
        <div className="flex items-center gap-2 py-2 text-green-700">
          <div className="size-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-sm font-medium">All objectives covered — great class engagement!</span>
        </div>
      )}

      {!loading && !error && gaps != null && gaps.length > 0 && !allCovered && (
        <div className="space-y-4">
          {(showAll ? gaps : gaps.slice(0, 4)).map(gap => {
            const pct = Math.round(gap.coverageRatio * 100)
            const barColor =
              gap.coverageRatio < 0.4
                ? 'bg-red-500'
                : gap.coverageRatio < 0.7
                ? 'bg-amber-400'
                : 'bg-green-500'
            const attemptedCount = gap.enrolledCount - gap.notAttemptedCount

            return (
              <div key={gap.objectiveId}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800 leading-snug">{gap.title}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0 text-right">
                    {attemptedCount}/{gap.enrolledCount} attempted · {Math.round(gap.avgMastery * 100)}% mastery
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{pct}% coverage</p>
              </div>
            )
          })}
          {!showAll && gaps.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show all {gaps.length} gaps
            </button>
          )}
        </div>
      )}
    </div>
  )
}
