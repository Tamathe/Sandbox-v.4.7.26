'use client'

import { useEffect, useState } from 'react'
import type { CourseMapProgress } from './types'

export function CourseMapAnalytics({ courseId, userEmail }: { courseId: string; userEmail: string }) {
  const [progress, setProgress] = useState<CourseMapProgress | null>(null)

  useEffect(() => {
    fetch(`/api/courses/${courseId}/course-map/progress`, { headers: { 'x-demo-user-email': userEmail } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.progress) setProgress(data.progress) })
      .catch(() => {})
  }, [courseId, userEmail])

  if (!progress || !progress.hasData) return null

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Student Progress</span>
        <span className="text-sm font-extrabold text-[#0033A0]">{progress.overallMasteredPct}% mastered</span>
      </div>
      <div className="flex items-end gap-1">
        {progress.weeks.map((w) => {
          const total = w.totalObjectives || 1
          const masteredPct = (w.mastered / total) * 100
          const strugglingPct = (w.struggling / total) * 100
          const notStartedPct = 100 - masteredPct - strugglingPct

          return (
            <div key={w.weekNumber} className="group relative flex-1" title={`Week ${w.weekNumber}: ${w.mastered} mastered, ${w.struggling} struggling, ${w.notStarted} not started`}>
              <div className="flex h-8 flex-col overflow-hidden rounded-sm">
                <div className="bg-emerald-400" style={{ height: `${masteredPct}%` }} />
                <div className="bg-amber-400" style={{ height: `${strugglingPct}%` }} />
                <div className="bg-gray-200" style={{ height: `${notStartedPct}%` }} />
              </div>
              <p className="mt-1 text-center text-[10px] text-gray-400">W{w.weekNumber}</p>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg group-hover:block">
                <p className="font-semibold text-gray-800">Week {w.weekNumber}</p>
                <p className="text-emerald-600">{w.mastered} mastered</p>
                <p className="text-amber-600">{w.struggling} struggling</p>
                <p className="text-gray-400">{w.notStarted} not started</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-400" /> Mastered</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-400" /> Struggling</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-gray-200" /> Not started</span>
      </div>
    </div>
  )
}
