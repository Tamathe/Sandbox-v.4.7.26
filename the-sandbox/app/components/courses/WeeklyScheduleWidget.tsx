'use client'

import { useEffect, useState } from 'react'

interface WeekAssignment {
  title: string
  type: string
  dueDate: string | null
  pointsPossible: number | null
}

interface WeekData {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
  assignments: WeekAssignment[]
}

interface WeeklyScheduleWidgetProps {
  courseId: string
  userEmail: string
  onSwitchToAssignments: () => void
}

export default function WeeklyScheduleWidget({
  courseId,
  userEmail,
  onSwitchToAssignments,
}: WeeklyScheduleWidgetProps) {
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/course-map`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { courseMap?: { weeks?: WeekData[] } }) => {
        const weeks = data.courseMap?.weeks ?? []
        const now = new Date()
        // Find the week whose date range contains today
        const active = weeks.find((w) => {
          if (!w.startDate || !w.endDate) return false
          return now >= new Date(w.startDate) && now <= new Date(w.endDate)
        })
        // Fallback: pick the first week with a future end date, or the last week
        setCurrentWeek(active ?? weeks.find((w) => w.endDate && new Date(w.endDate) >= now) ?? weeks[0] ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [courseId, userEmail])

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading schedule...</p>
  }

  if (!currentWeek) {
    return <p className="text-sm text-gray-500">No schedule available yet.</p>
  }

  const assignments = currentWeek.assignments ?? []

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Week {currentWeek.weekNumber}: {currentWeek.title}
      </p>
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">No assignments this week.</p>
      ) : (
        <ul className="space-y-1.5">
          {assignments.map((a, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-700">{a.title}</span>
              {a.dueDate && (
                <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                  {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onSwitchToAssignments}
        className="mt-1 text-xs font-semibold text-[#0033A0] hover:underline"
      >
        See full schedule
      </button>
    </div>
  )
}
