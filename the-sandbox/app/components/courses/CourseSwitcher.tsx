'use client'

import { AlertTriangle, ChevronDown, ClipboardCheck, Plus, Search, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Course } from './course-types'
import type { CourseSummaryItem } from '../../lib/course-summary-service'

interface CourseSwitcherProps {
  courses: Course[]
  selectedCourse: Course | null
  onSelect: (courseId: string) => void
  onSelectAll?: () => void
  isEducator: boolean
  summaryMap?: Record<string, CourseSummaryItem>
  onNewCourse: () => void
  onCanvasImport: () => void
}

function SummaryBadges({ summary }: { summary: CourseSummaryItem | undefined }) {
  if (!summary) return null
  return (
    <>
      {summary.ungradedCount > 0 && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
          {summary.ungradedCount} ungraded
        </span>
      )}
      {(summary.atRiskInactive7d > 0 || summary.atRiskMissed2plus > 0) && (
        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
          {summary.atRiskInactive7d + summary.atRiskMissed2plus} at-risk
        </span>
      )}
    </>
  )
}

export default function CourseSwitcher({
  courses,
  selectedCourse,
  onSelect,
  onSelectAll,
  isEducator,
  summaryMap = {},
  onNewCourse,
  onCanvasImport,
}: CourseSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = search.trim()
    ? courses.filter(
        (c) =>
          c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
          c.title.toLowerCase().includes(search.toLowerCase())
      )
    : courses

  // Focus search when dropdown opens
  useEffect(() => {
    if (open && courses.length > 3) {
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open, courses.length])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setSearch('') }}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
      >
        {selectedCourse ? (
          <>
            <span className="font-bold text-gray-900">{selectedCourse.courseCode}</span>
            <span className="text-gray-500">—</span>
            <span className="truncate max-w-[240px] text-gray-700">{selectedCourse.title}</span>
            <SummaryBadges summary={summaryMap[selectedCourse.id]} />
          </>
        ) : (
          <span className="text-gray-400">Select a course…</span>
        )}
        <ChevronDown className={`size-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Search */}
          {courses.length > 3 && (
            <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses…"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#0033A0] focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* All Courses row */}
          {onSelectAll && (
            <button
              type="button"
              onClick={() => {
                onSelectAll()
                setOpen(false)
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-50 border-b border-gray-100"
            >
              All Courses
            </button>
          )}

          {/* Course list */}
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No courses match your search.
            </div>
          ) : (
            filtered.map((course) => {
              const isActive = course.id === selectedCourse?.id
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => {
                    onSelect(course.id)
                    setOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-[#0033A0]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold">{course.courseCode}</span>
                    <span className="truncate text-sm">{course.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      {course._count.materials} material{course._count.materials !== 1 ? 's' : ''}
                    </span>
                    {summaryMap[course.id]
                      ? <SummaryBadges summary={summaryMap[course.id]} />
                      : <span className="h-3 w-14 animate-pulse rounded-full bg-gray-100" />
                    }
                  </div>
                </button>
              )
            })
          )}

          {/* Educator footer */}
          {isEducator && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-2 flex gap-2">
              <button
                type="button"
                onClick={() => { onNewCourse(); setOpen(false) }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
              >
                <Plus className="size-4" />
                New Course
              </button>
              <button
                type="button"
                onClick={() => { onCanvasImport(); setOpen(false) }}
                title="Import from Canvas"
                className="inline-flex items-center justify-center rounded-xl border-2 border-[#0033A0] px-3 py-2 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
              >
                <Upload className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
