'use client'

import React from 'react'
import { Mail, AlertTriangle } from 'lucide-react'

interface CategoryCount {
  category: string
  count: number
  unreadCount: number
}

interface UrgentEmail {
  subject: string
  fromName: string
}

interface UrgencyBreakdown {
  respondToday: number
  thisWeek: number
  whenFree: number
  archive: number
}

interface Props {
  summary: {
    total: number
    unread: number
    categories: CategoryCount[]
    urgent: UrgentEmail[]
    urgencyBreakdown?: UrgencyBreakdown
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  student: '🎓',
  admin: '🏛️',
  department: '👥',
  external: '🌐',
  newsletter: '📰',
  urgent: '🔴',
  other: '📧',
}

export default function AssistantInboxSummary({ summary }: Props) {
  return (
    <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-white p-3 my-2">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="size-4 text-[#0033A0]" />
        <span className="text-xs font-bold text-[#0033A0] uppercase tracking-wide">Inbox</span>
        <span className="ml-auto text-xs text-gray-500">
          {summary.total} total · <span className="font-semibold text-[#0033A0]">{summary.unread} unread</span>
        </span>
      </div>

      <div className="space-y-1 mb-2">
        {summary.categories.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              {CATEGORY_EMOJI[cat.category] ?? '📧'} {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
            </span>
            <span className="text-gray-500">
              {cat.count}
              {cat.unreadCount > 0 && (
                <span className="ml-1 text-[#0033A0] font-semibold">({cat.unreadCount} new)</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {summary.urgencyBreakdown && (summary.urgencyBreakdown.respondToday > 0 || summary.urgencyBreakdown.thisWeek > 0) && (
        <div className="flex items-center gap-3 text-xs mb-2 px-1">
          {summary.urgencyBreakdown.respondToday > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-red-500" />
              <span className="font-semibold text-red-700">{summary.urgencyBreakdown.respondToday} respond-today</span>
            </span>
          )}
          {summary.urgencyBreakdown.thisWeek > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-amber-700">{summary.urgencyBreakdown.thisWeek} this-week</span>
            </span>
          )}
        </div>
      )}

      {summary.urgent.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 mt-2">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="size-3 text-red-500" />
            <span className="text-xs font-semibold text-red-700">Urgent</span>
          </div>
          {summary.urgent.map((email, i) => (
            <p key={i} className="text-xs text-red-600 ml-4.5 truncate">
              {email.fromName}: {email.subject}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
