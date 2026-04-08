'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { format, differenceInHours, isPast, isToday } from 'date-fns'
import type { TimelineItem } from '../api/student/timeline-consolidated/route'

// Deterministic course color from courseCode
const COURSE_COLORS = [
  { bg: 'bg-[#0033A0]', text: 'text-white', border: 'border-[#0033A0]', dot: 'bg-[#0033A0]' },
  { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-600', dot: 'bg-teal-600' },
  { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600', dot: 'bg-amber-600' },
  { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-600', dot: 'bg-rose-600' },
  { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', dot: 'bg-emerald-600' },
  { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600', dot: 'bg-purple-600' },
]

function courseColor(code: string) {
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length]
}

interface ConsolidatedTimelineProps {
  userEmail: string
}

export default function ConsolidatedTimeline({ userEmail }: ConsolidatedTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/student/timeline-consolidated', {
          headers: { 'x-demo-user-email': userEmail },
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json() as { items: TimelineItem[] }
        if (!cancelled) setItems(data.items)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userEmail])

  if (loading) {
    return (
      <div className="mb-5 rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading your schedule...</span>
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  // Group by date for the compact view
  const next7Days = items.filter((item) => {
    if (!item.dueAt) return false
    const h = differenceInHours(new Date(item.dueAt), new Date())
    return h >= -24 && h <= 168 // past 24h to 7 days ahead
  })

  // Group by course for the expanded swim-lane view
  const courseGroups = new Map<string, { code: string; title: string; items: TimelineItem[] }>()
  for (const item of items) {
    const existing = courseGroups.get(item.courseId)
    if (existing) {
      existing.items.push(item)
    } else {
      courseGroups.set(item.courseId, {
        code: item.courseCode,
        title: item.courseTitle,
        items: [item],
      })
    }
  }

  const displayItems = expanded ? items : next7Days.slice(0, 8)
  const hasMore = next7Days.length > 8 || items.length > next7Days.length

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
          <Calendar className="size-4 text-[#0033A0]" />
          Your Schedule
          <span className="text-[10px] font-bold text-[#0033A0] bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 normal-case tracking-normal">
            {items.filter((i) => i.type === 'assignment' && !i.isCompleted).length} upcoming
          </span>
        </h2>
        <Link href="/courses" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
          All courses <ArrowRight className="size-3" />
        </Link>
      </div>

      {!expanded ? (
        /* ── Compact view: next 7 days ────────────────────────────────── */
        <div className="space-y-2">
          {displayItems.map((item) => {
            const color = courseColor(item.courseCode)
            const hoursLeft = item.dueAt ? differenceInHours(new Date(item.dueAt), new Date()) : 999
            const isDueToday = item.dueAt ? isToday(new Date(item.dueAt)) : false
            const isDueSoon = hoursLeft >= 0 && hoursLeft < 72 && !isDueToday
            const isOverdue = item.dueAt ? isPast(new Date(item.dueAt)) && !isDueToday : false

            const cardBorder = isDueToday
              ? 'border-red-200 bg-red-50/30'
              : isDueSoon
              ? 'border-amber-200 bg-amber-50/20'
              : 'border-gray-100'

            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.url}
                className={`flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-2.5 transition-all hover:shadow-sm ${cardBorder}`}
              >
                {/* Course avatar */}
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color.bg} ${color.text}`}>
                  {item.courseCode.slice(0, 2)}
                </span>

                {/* Icon */}
                {item.type === 'assignment' ? (
                  item.isCompleted ? (
                    <Check className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <ClipboardList className="size-4 shrink-0 text-amber-600" />
                  )
                ) : (
                  <BookOpen className={`size-4 shrink-0 ${item.isCompleted ? 'text-emerald-500' : 'text-gray-400'}`} />
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-semibold ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>{item.courseCode}</span>
                    {item.dueAt && (
                      <>
                        <span>·</span>
                        <span className={
                          isDueToday ? 'font-bold text-red-600' :
                          isOverdue ? 'font-bold text-red-500' :
                          isDueSoon ? 'text-amber-600' :
                          ''
                        }>
                          {isDueToday ? 'Due today' :
                           isOverdue ? 'Overdue' :
                           format(new Date(item.dueAt), 'EEE, MMM d')}
                        </span>
                      </>
                    )}
                    {item.pointsPossible != null && item.type === 'assignment' && (
                      <>
                        <span>·</span>
                        <span>{item.pointsPossible} pts</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges */}
                {isDueToday && !item.isCompleted && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    Today
                  </span>
                )}
                {item.isCompleted && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Done
                  </span>
                )}
              </Link>
            )
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-[#0033A0] hover:bg-blue-50 hover:text-[#0033A0]"
            >
              See full schedule
              <ChevronDown className="size-4" />
            </button>
          )}
        </div>
      ) : (
        /* ── Expanded view: swim lanes by course ──────────────────────── */
        <div className="space-y-3">
          {Array.from(courseGroups.entries()).map(([courseId, group]) => {
            const color = courseColor(group.code)
            return (
              <div key={courseId} className="rounded-2xl border-2 border-gray-200 bg-white">
                {/* Course header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color.bg} ${color.text}`}>
                    {group.code.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900">{group.code}</span>
                    <span className="ml-2 text-xs text-gray-400 truncate">{group.title}</span>
                  </div>
                  <Link
                    href={`/courses?course=${courseId}&tab=course-map`}
                    className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
                  >
                    Weekly Schedule <ChevronRight className="size-3" />
                  </Link>
                </div>
                {/* Items */}
                <div className="divide-y divide-gray-50 px-4">
                  {group.items.map((item) => {
                    const isDueToday = item.dueAt ? isToday(new Date(item.dueAt)) : false
                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={item.url}
                        className="flex items-center gap-3 py-2.5 transition-colors hover:bg-gray-50 -mx-4 px-4"
                      >
                        {item.type === 'assignment' ? (
                          item.isCompleted ? (
                            <Check className="size-4 shrink-0 text-emerald-500" />
                          ) : (
                            <ClipboardList className="size-4 shrink-0 text-amber-600" />
                          )
                        ) : (
                          <BookOpen className={`size-4 shrink-0 ${item.isCompleted ? 'text-emerald-500' : 'text-gray-400'}`} />
                        )}
                        <span className={`flex-1 text-sm ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {item.title}
                        </span>
                        {item.dueAt && (
                          <span className={`text-xs ${isDueToday ? 'font-bold text-red-600' : 'text-gray-400'}`}>
                            {isDueToday ? 'Today' : format(new Date(item.dueAt), 'MMM d')}
                          </span>
                        )}
                        {item.isCompleted && <Check className="size-3.5 text-emerald-500" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-[#0033A0] hover:bg-blue-50 hover:text-[#0033A0]"
          >
            Show compact view
            <ChevronDown className="size-4 rotate-180" />
          </button>
        </div>
      )}
    </div>
  )
}
