'use client'

// ── Teaching Today ──────────────────────────────────────────────
// Morning section (6 AM – 2 PM) showing today's classes with context:
// course name, time, room, at-risk count, pending submissions, and a
// 1-click "Prep with Sandy" and "Go Live" action.

import Link from 'next/link'
import { Bot, Clock, MapPin, AlertTriangle, Radio, Users } from 'lucide-react'

interface TodayClass {
  courseId: string
  courseCode: string
  courseTitle: string
  startTime: string
  endTime: string
  location: string | null
  atRiskCount: number
  pendingSubmissions: number
  enrolled: number
}

interface TeachingTodayProps {
  classes: TodayClass[]
}

export default function TeachingToday({ classes }: TeachingTodayProps) {
  if (classes.length === 0) return null

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 shadow-sm">
      <div className="border-b border-blue-100 px-5 py-3">
        <h2 className="text-sm font-extrabold text-gray-900">Teaching Today</h2>
      </div>

      <div className="divide-y divide-blue-50 px-5 py-2">
        {classes.map((cls) => {
          const start = new Date(cls.startTime)
          const end = new Date(cls.endTime)
          const now = new Date()
          const minsUntil = Math.round((start.getTime() - now.getTime()) / 60_000)
          const isNow = start <= now && end >= now
          const isPast = end < now

          const timeStr = `${formatTime(start)} – ${formatTime(end)}`
          const urgencyLabel = isNow
            ? 'In progress'
            : isPast
              ? 'Done'
              : minsUntil < 60
                ? `In ${minsUntil} min`
                : minsUntil < 120
                  ? `In 1 hr ${minsUntil - 60} min`
                  : `In ${Math.floor(minsUntil / 60)} hrs`

          return (
            <div key={cls.courseId} className={`py-3 ${isPast ? 'opacity-50' : ''}`}>
              {/* Course header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold text-[#0033A0]">{cls.courseCode}</span>
                  <span className="text-sm text-gray-600 truncate">{cls.courseTitle}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  isNow ? 'bg-[#0033A0] text-white animate-pulse' : isPast ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
                }`}>
                  {urgencyLabel}
                </span>
              </div>

              {/* Details row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> {timeStr}
                </span>
                {cls.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {cls.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="size-3" /> {cls.enrolled} enrolled
                </span>
                {cls.atRiskCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertTriangle className="size-3" /> {cls.atRiskCount} at risk
                  </span>
                )}
                {cls.pendingSubmissions > 0 && (
                  <span className="text-amber-600 font-medium">
                    {cls.pendingSubmissions} ungraded
                  </span>
                )}
              </div>

              {/* Actions */}
              {!isPast && (
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href={`/courses?course=${cls.courseId}`}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    Open course
                  </Link>
                  <Link
                    href={`/sandcastle/new?courseId=${encodeURIComponent(cls.courseId)}&courseCode=${encodeURIComponent(cls.courseCode)}`}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                  >
                    <Radio className="size-3" /> Go Live
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('sandy-prefill', {
                        detail: {
                          message: `Help me prepare for today's ${cls.courseCode} class (${cls.courseTitle}). What should I focus on and are any students struggling?`,
                          autoSend: true,
                        },
                      }))
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    <Bot className="size-3" /> Prep with Sandy
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
