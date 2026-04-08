// app/components/courses/TimelineTrack.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  FileText, HelpCircle, GraduationCap, Folder, BookOpen,
  Presentation, FlaskConical, MessageSquare, Users, Circle,
} from 'lucide-react'
import type { TimelineItem, TimelineWeek } from '../../lib/courses/timeline-service'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  homework: FileText,
  quiz: HelpCircle,
  exam: GraduationCap,
  project: Folder,
  paper: BookOpen,
  presentation: Presentation,
  lab: FlaskConical,
  discussion: MessageSquare,
  participation: Users,
  other: Circle,
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-green-500',
  graded: 'bg-green-500',
  upcoming: 'bg-gray-400',
  'due-soon': 'bg-amber-500 timeline-pulse',
  overdue: 'bg-red-500',
}

interface TimelineTrackProps {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number
  semesterStart: string
  semesterEnd: string
  onItemSelect: (item: TimelineItem) => void
  selectedItemId: string | null
}

export default function TimelineTrack({
  weeks, items, currentWeek, semesterStart, semesterEnd,
  onItemSelect, selectedItemId,
}: TimelineTrackProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const start = new Date(semesterStart).getTime()
  const end = new Date(semesterEnd).getTime()
  const range = end - start || 1
  const WEEK_WIDTH = 120
  const innerWidth = Math.max(weeks.length * WEEK_WIDTH, 800)

  function toPercent(dateStr: string): number {
    const t = new Date(dateStr).getTime()
    return Math.max(0, Math.min(100, ((t - start) / range) * 100))
  }

  const todayPercent = toPercent(new Date().toISOString())

  // Scroll to center "today" at ~35% from left
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const todayPx = (todayPercent / 100) * innerWidth
    const targetScroll = todayPx - el.clientWidth * 0.35
    el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }, [todayPercent, innerWidth])

  // Group items by date to handle same-date stacking
  const itemsByDate = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const dateKey = item.dueAt.slice(0, 10)
    const group = itemsByDate.get(dateKey) || []
    group.push(item)
    itemsByDate.set(dateKey, group)
  }

  return (
    <div
      ref={scrollRef}
      className="relative h-20 bg-white border-b border-gray-200 overflow-x-auto scroll-smooth timeline-hidden-scrollbar"
      role="img"
      aria-label="Course timeline"
    >
      <div className="relative h-full" style={{ width: `${innerWidth}px` }}>
        {/* Week bands */}
        {weeks.map((week, i) => {
          const wStart = week.startDate ? toPercent(week.startDate) : (i / weeks.length) * 100
          const wEnd = week.endDate ? toPercent(week.endDate) : ((i + 1) / weeks.length) * 100
          return (
            <div key={week.weekNumber}>
              <div
                className={`absolute top-0 bottom-0 ${i % 2 === 0 ? 'bg-gray-50/60' : ''}`}
                style={{ left: `${wStart}%`, width: `${wEnd - wStart}%` }}
              />
              <span
                className="absolute bottom-1 text-[10px] text-gray-400"
                style={{ left: `${(wStart + wEnd) / 2}%`, transform: 'translateX(-50%)' }}
              >
                W{week.weekNumber}
              </span>
            </div>
          )
        })}

        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-gray-200 rounded-full -translate-y-1/2" />

        {/* Today marker */}
        <div
          ref={todayRef}
          className="absolute top-0 bottom-0 w-[2px] bg-[#0033A0] z-10"
          style={{ left: `${todayPercent}%` }}
          aria-current="date"
        >
          <span className="absolute -top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#0033A0] whitespace-nowrap">
            TODAY
          </span>
        </div>

        {/* Assignment dots */}
        {Array.from(itemsByDate.entries()).map(([dateKey, group]) =>
          group.map((item, stackIdx) => {
            const left = toPercent(item.dueAt)
            const offset = stackIdx > 0 ? stackIdx * 8 : 0
            const isHovered = hoveredId === item.id
            const isSelected = selectedItemId === item.id
            const showExtra = stackIdx >= 3

            if (showExtra && stackIdx === 3) {
              return (
                <span
                  key={`overflow-${dateKey}`}
                  className="absolute text-[9px] text-gray-500 font-semibold"
                  style={{ left: `${left}%`, top: `calc(50% + ${offset}px - 6px)`, transform: 'translateX(-50%)' }}
                >
                  +{group.length - 3}
                </span>
              )
            }
            if (showExtra) return null

            return (
              <div key={item.id} className="absolute z-20" style={{ left: `${left}%`, top: `calc(50% - 6px - ${offset}px)`, transform: 'translateX(-50%)' }}>
                <button
                  type="button"
                  className={`
                    ${isHovered ? 'size-4' : 'size-3'} rounded-full border-2 border-white shadow-sm
                    ${STATUS_COLORS[item.status]}
                    ${isSelected ? 'ring-2 ring-[#0033A0] ring-offset-1' : ''}
                    transition-transform duration-150
                  `}
                  aria-label={`${item.title}, ${item.status}, due ${format(new Date(item.dueAt), 'MMM d')}`}
                  onClick={() => onItemSelect(item)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-30 pointer-events-none">
                    {item.title} — {formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })}
                  </div>
                )}
                {/* Score badge for graded */}
                {item.status === 'graded' && item.score !== null && (
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[9px] font-semibold text-green-700 whitespace-nowrap">
                    {item.score}
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
