'use client'

import { Filter } from 'lucide-react'

export type TimelineEventType =
  | 'session'
  | 'mastery_jump'
  | 'transfer'
  | 'misconception_cleared'
  | 'bloom_advance'
  | 'study_plan'

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  session: 'Sessions',
  mastery_jump: 'Mastery',
  transfer: 'Transfer',
  misconception_cleared: 'Misconceptions',
  bloom_advance: 'Bloom',
  study_plan: 'Study Plans',
}

const ALL_TYPES: TimelineEventType[] = [
  'session',
  'mastery_jump',
  'transfer',
  'misconception_cleared',
  'bloom_advance',
  'study_plan',
]

interface EnrolledCourse {
  courseId: string
  courseCode: string
  title: string
}

export interface TimelineFilterState {
  courseId: string | undefined
  from: string
  to: string
  types: Set<TimelineEventType>
}

interface TimelineFiltersProps {
  courses: EnrolledCourse[]
  filters: TimelineFilterState
  onChange: (filters: TimelineFilterState) => void
}

export default function TimelineFilters({ courses, filters, onChange }: TimelineFiltersProps) {
  function toggleType(type: TimelineEventType) {
    const next = new Set(filters.types)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    onChange({ ...filters, types: next })
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-bold text-gray-900">Filters</h3>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Course dropdown */}
        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-course" className="text-xs font-medium text-gray-500">
            Course
          </label>
          <select
            id="timeline-course"
            value={filters.courseId ?? ''}
            onChange={(e) =>
              onChange({ ...filters, courseId: e.target.value || undefined })
            }
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.courseCode} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-from" className="text-xs font-medium text-gray-500">
            From
          </label>
          <input
            id="timeline-from"
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-to" className="text-xs font-medium text-gray-500">
            To
          </label>
          <input
            id="timeline-to"
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>
      </div>

      {/* Event type chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {ALL_TYPES.map((type) => {
          const active = filters.types.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-[#0033A0] text-white border-[#0033A0]'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {EVENT_TYPE_LABELS[type]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
