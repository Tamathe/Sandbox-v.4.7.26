'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Loader2,
  Target,
} from 'lucide-react'
import { format, isWithinInterval, addDays, isBefore } from 'date-fns'

interface WeekData {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
  materials: { title: string; materialType: string }[]
  objectives: { title: string; bloomLevel: string | null }[]
  assignments: { title: string; type: string; dueDate: string | null; pointsPossible: number | null }[]
}

interface ThisWeekCardProps {
  courseId: string
  userEmail: string
  onSwitchTab: (tab: string) => void
}

export default function ThisWeekCard({ courseId, userEmail, onSwitchTab }: ThisWeekCardProps) {
  const [week, setWeek] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [readMaterials, setReadMaterials] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}/course-map`, {
          headers: { 'x-demo-user-email': userEmail },
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json() as { courseMap: { weeks: WeekData[] } | null }
        if (cancelled || !data.courseMap) return

        const now = new Date()
        const weeks = data.courseMap.weeks

        // Find current week (startDate <= now <= endDate)
        let current = weeks.find((w) => {
          if (!w.startDate || !w.endDate) return false
          return isWithinInterval(now, { start: new Date(w.startDate), end: new Date(w.endDate) })
        })

        // Fallback: find next upcoming week
        if (!current) {
          current = weeks.find((w) => {
            if (!w.startDate) return false
            return !isBefore(new Date(w.startDate), now) && isBefore(new Date(w.startDate), addDays(now, 14))
          })
        }

        // Last fallback: first week
        if (!current && weeks.length > 0) {
          current = weeks[0]
        }

        if (!cancelled && current) setWeek(current)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Also fetch read statuses
    async function loadReadStatus() {
      try {
        const res = await fetch(`/api/courses/${courseId}/materials`, {
          headers: { 'x-demo-user-email': userEmail },
        })
        if (!res.ok) return
        const data = await res.json() as { id: string; isRead: boolean }[]
        if (!cancelled) {
          const readSet = new Set<string>()
          for (const m of data) {
            if (m.isRead) readSet.add(m.id)
          }
          setReadMaterials(readSet)
        }
      } catch {
        // silent
      }
    }

    load()
    loadReadStatus()
    return () => { cancelled = true }
  }, [courseId, userEmail])

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading schedule...</span>
        </div>
      </div>
    )
  }

  if (!week) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 px-5 py-6 text-center">
        <Calendar className="mx-auto mb-2 size-8 text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">No weekly schedule available yet</p>
        <p className="mt-1 text-xs text-gray-400">Check the Assignments tab for upcoming due dates.</p>
      </div>
    )
  }

  const hasRead = week.materials.length > 0
  const hasDue = week.assignments.length > 0
  const hasPractice = week.objectives.length > 0

  return (
    <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-gradient-to-br from-blue-50/50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0033A0]">This Week</p>
          <h3 className="text-base font-extrabold text-gray-900">{week.title}</h3>
        </div>
        <span className="rounded-full bg-[#0033A0] px-2.5 py-0.5 text-xs font-bold text-white">
          Week {week.weekNumber}
        </span>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* Read column */}
        {hasRead && (
          <div className="px-5 py-3">
            <div className="mb-2 flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Read</span>
            </div>
            <ul className="space-y-1.5">
              {week.materials.slice(0, 5).map((m, i) => {
                const isRead = readMaterials.has(m.title) // approximate match by title
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {isRead ? (
                      <Check className="size-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="size-3.5 shrink-0 rounded border border-gray-300" />
                    )}
                    <span className={isRead ? 'text-gray-400 line-through' : 'text-gray-700'}>
                      {m.title}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Due column */}
        {hasDue && (
          <div className="px-5 py-3">
            <div className="mb-2 flex items-center gap-1.5">
              <ClipboardList className="size-3.5 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Due</span>
            </div>
            <ul className="space-y-1.5">
              {week.assignments.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="size-3.5 shrink-0 rounded border border-gray-300" />
                  <span className="text-gray-700">{a.title}</span>
                  {a.dueDate && (
                    <span className="ml-auto text-xs text-gray-400">
                      {format(new Date(a.dueDate), 'EEE MMM d')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Practice row */}
      {hasPractice && (
        <div className="border-t border-gray-100 px-5 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Target className="size-3.5 text-[#0033A0]" />
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Topics to Study</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {week.objectives.slice(0, 6).map((obj, i) => (
              <span key={i} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#0033A0]">
                {obj.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={() => onSwitchTab('course-map')}
          className="flex items-center gap-1 text-sm font-semibold text-[#0033A0] hover:underline"
        >
          Open Weekly Schedule
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
