'use client'

import type { SemesterConstellation } from '../../lib/constellation-service'

interface ConstellationStatsProps {
  data: SemesterConstellation
}

function masteryColor(mastery: number): string {
  if (mastery > 0.75) return 'text-green-600'
  if (mastery >= 0.4) return 'text-amber-600'
  if (mastery > 0) return 'text-red-600'
  return 'text-gray-400'
}

function masteryBarColor(mastery: number): string {
  if (mastery > 0.75) return 'bg-green-500'
  if (mastery >= 0.4) return 'bg-amber-500'
  if (mastery > 0) return 'bg-red-500'
  return 'bg-gray-300'
}

export default function ConstellationStats({
  data,
}: ConstellationStatsProps) {
  const pct = Math.round(data.overallMastery * 100)
  const transferCount = data.transferEdges.length

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">
        Semester Overview
      </h3>

      {/* Overall Mastery */}
      <div className="mb-3">
        <p className="text-xs text-gray-500">Overall Mastery</p>
        <p className={`text-2xl font-extrabold ${masteryColor(data.overallMastery)}`}>
          {pct}%
        </p>
      </div>

      {/* SR Due */}
      <div className="mb-3">
        <p className="text-xs text-gray-500">Reviews Due</p>
        <p
          className={`text-lg font-bold ${
            data.srDueCount > 0 ? 'text-amber-600' : 'text-gray-400'
          }`}
        >
          {data.srDueCount}
        </p>
      </div>

      {/* Transfer Edges */}
      <div className="mb-4">
        <p className="text-xs text-gray-500">Cross-Course Connections</p>
        <p className="text-lg font-bold text-[#0033A0]">{transferCount}</p>
      </div>

      {/* Per-course Mastery Bars */}
      {data.courses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Course Mastery
          </p>
          <div className="space-y-2">
            {data.courses.map((course) => {
              const coursePct = Math.round(course.aggregateMastery * 100)
              return (
                <div key={course.courseId}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700">
                      {course.courseCode}
                    </span>
                    <span className="text-xs text-gray-400">{coursePct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${masteryBarColor(course.aggregateMastery)}`}
                      style={{ width: `${coursePct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
