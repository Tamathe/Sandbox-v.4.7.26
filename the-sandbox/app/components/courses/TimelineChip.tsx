// app/components/courses/TimelineChip.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { X, ChevronRight } from 'lucide-react'
import type { TimelineItem, TimelineWeek } from '../../lib/courses/timeline-service'

const STATUS_DOT_COLORS: Record<string, string> = {
  submitted: 'bg-green-500',
  graded: 'bg-green-500',
  upcoming: 'bg-gray-400',
  'due-soon': 'bg-amber-500',
  overdue: 'bg-red-500',
}

interface TimelineChipProps {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number
  onItemSelect: (item: TimelineItem) => void
}

export default function TimelineChip({ weeks, items, currentWeek, onItemSelect }: TimelineChipProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const now = new Date()
  const upcoming = items
    .filter(i => new Date(i.dueAt) >= now || i.status === 'overdue')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5)

  const nextDue = upcoming[0]
  const hasOverdue = items.some(i => i.status === 'overdue')
  const hasDueSoon = items.some(i => i.status === 'due-soon')

  const chipBorder = hasOverdue
    ? 'border-red-300 bg-red-50 text-red-700'
    : hasDueSoon
      ? 'border-amber-300 bg-amber-50 text-amber-700'
      : 'border-gray-200 bg-gray-50 text-gray-700'

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setSheetOpen(false)
  }, [])

  useEffect(() => {
    if (sheetOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [sheetOpen, handleEscape])

  const chipText = nextDue
    ? `Week ${currentWeek} of ${weeks.length} — ${nextDue.title} ${formatDistanceToNow(new Date(nextDue.dueAt), { addSuffix: true })}`
    : `Week ${currentWeek} of ${weeks.length}`

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`w-full rounded-full border px-4 py-2 text-sm font-medium text-left truncate ${chipBorder}`}
      >
        {chipText}
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900">Upcoming</h3>
              <button type="button" onClick={() => setSheetOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {upcoming.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming assignments</p>
              )}
              {upcoming.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSheetOpen(false); onItemSelect(item) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className={`size-2.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[item.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(item.dueAt), 'MMM d')} · {formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 capitalize flex-shrink-0">
                    {item.category}
                  </span>
                  <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
