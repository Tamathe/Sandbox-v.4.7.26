'use client'

import Link from 'next/link'
import { Calendar, Mail, Pin } from 'lucide-react'
import type { RightNowData } from '../../lib/student-home-data'

const URGENCY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning:  'bg-amber-500',
  info:     'bg-blue-500',
}

export default function RightNowCard({ rightNow }: { rightNow: RightNowData }) {
  const { nextClass, urgentEmail, topDeadline } = rightNow

  // Don't render if all three domains are empty
  if (!nextClass && !urgentEmail && !topDeadline) return null

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-4 dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
        Right Now
      </h3>

      <div className="space-y-1.5">
        {/* ── Next class ── */}
        {nextClass && (
          <button
            type="button"
            onClick={() => {
              // Scroll to timeline section
              document.querySelector('[data-section="timeline"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <Calendar className="size-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
              <span className="font-semibold">{nextClass.title}</span>
              {' '}({nextClass.courseCode})
              {' — '}
              {nextClass.isNow ? (
                <span className="font-bold text-emerald-600">NOW</span>
              ) : nextClass.minutesUntil === -1 ? (
                <span>{nextClass.time} tomorrow</span>
              ) : (
                <span>{nextClass.time}</span>
              )}
              {nextClass.location && `, ${nextClass.location}`}
            </span>
            {nextClass.isNow && (
              <span className={`size-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse`} />
            )}
          </button>
        )}

        {/* ── Urgent email ── */}
        {urgentEmail && (
          <Link
            href="/messages"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
          >
            <Mail className="size-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
              <span className="font-semibold">{urgentEmail.subject}</span>
              {' — '}
              {urgentEmail.urgency === 'respond-today' ? 'respond today' : 'this week'}
            </span>
            <span className={`size-2 rounded-full flex-shrink-0 ${
              urgentEmail.urgency === 'respond-today' ? URGENCY_DOT.warning : URGENCY_DOT.info
            }`} />
          </Link>
        )}

        {/* ── Top deadline ── */}
        {topDeadline && (
          <Link
            href="/courses"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
          >
            <Pin className="size-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
              <span className="font-semibold">{topDeadline.title}</span>
              {' '}({topDeadline.courseCode})
              {' — '}
              <span className={
                topDeadline.urgency === 'critical' ? 'font-bold text-red-600' :
                topDeadline.urgency === 'warning' ? 'font-semibold text-amber-600' :
                'text-blue-600'
              }>
                {topDeadline.dueLabel}
              </span>
            </span>
            <span className={`size-2 rounded-full flex-shrink-0 ${URGENCY_DOT[topDeadline.urgency]}`} />
          </Link>
        )}
      </div>
    </div>
  )
}
