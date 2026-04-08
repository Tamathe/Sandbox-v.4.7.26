'use client'

import { useState } from 'react'
import { ShieldCheck, Bot, Clock, AlertTriangle, CheckCircle, Calendar, Filter } from 'lucide-react'
import type { ComplianceCalendarData, ComplianceDeadline } from '../../lib/registrar/compliance-calendar'

interface ComplianceCalendarProps {
  data: ComplianceCalendarData | null
  loading: boolean
}

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'federal', label: 'Federal' },
  { key: 'accreditation', label: 'Accreditation' },
  { key: 'state', label: 'State' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'operations', label: 'Operations' },
] as const

const URGENCY_STYLES: Record<string, { badge: string; row: string }> = {
  critical: { badge: 'bg-red-100 text-red-700', row: 'bg-red-50' },
  warning: { badge: 'bg-amber-100 text-amber-700', row: 'bg-amber-50' },
  normal: { badge: 'bg-blue-100 text-blue-700', row: '' },
  safe: { badge: 'bg-green-100 text-green-700', row: '' },
}

const CATEGORY_COLORS: Record<string, string> = {
  federal: 'bg-blue-100 text-blue-700',
  accreditation: 'bg-purple-100 text-purple-700',
  state: 'bg-teal-100 text-teal-700',
  compliance: 'bg-orange-100 text-orange-700',
  operations: 'bg-gray-100 text-gray-600',
}

function countdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function UrgencyIcon({ urgency, status }: { urgency: string; status: string }) {
  if (status === 'completed') return <CheckCircle className="size-4 text-green-500" />
  if (urgency === 'critical') return <AlertTriangle className="size-4 text-red-500" />
  if (urgency === 'warning') return <Clock className="size-4 text-amber-500" />
  return <Calendar className="size-4 text-gray-400" />
}

function DeadlineCard({ deadline }: { deadline: ComplianceDeadline }) {
  const style = URGENCY_STYLES[deadline.urgency] ?? URGENCY_STYLES.safe
  const catColor = CATEGORY_COLORS[deadline.category] ?? 'bg-gray-100 text-gray-600'
  const dueDate = new Date(deadline.dueDate)
  const isCompleted = deadline.status === 'completed'

  return (
    <div className={`rounded-2xl p-4 border-2 border-gray-200 ${isCompleted ? 'bg-gray-50 opacity-75' : style.row || 'bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <UrgencyIcon urgency={deadline.urgency} status={deadline.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {deadline.name}
              </h3>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catColor}`}>
                {deadline.category.charAt(0).toUpperCase() + deadline.category.slice(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              {' · '}
              {deadline.agency}
              {' · '}
              {deadline.recurrence}
            </p>
            {/* Sandy note */}
            <div className="flex items-start gap-1.5 mt-2">
              <Bot className="size-3.5 text-[#0033A0] shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">{deadline.sandyNote}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {isCompleted ? (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
              <CheckCircle className="size-3" /> Done
            </span>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${style.badge}`}>
              {countdownLabel(deadline.daysUntil)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ComplianceCalendar({ data, loading }: ComplianceCalendarProps) {
  const [filter, setFilter] = useState<string>('all')

  const filterDeadlines = (deadlines: ComplianceDeadline[]) => {
    if (filter === 'all') return deadlines
    return deadlines.filter((d) => d.category === filter)
  }

  const upcoming = filterDeadlines(data?.upcoming ?? [])
  const later = filterDeadlines(data?.later ?? [])
  const completed = filterDeadlines(data?.completed ?? [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-4 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Next critical alert */}
      {data?.nextCritical && (
        <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${
          data.nextCritical.urgency === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <ShieldCheck className={`size-5 shrink-0 mt-0.5 ${
            data.nextCritical.urgency === 'critical' ? 'text-red-600' : 'text-amber-600'
          }`} />
          <div>
            <p className="text-sm font-bold text-gray-900">
              Next Critical: {data.nextCritical.name} — {countdownLabel(data.nextCritical.daysUntil)}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">{data.nextCritical.sandyNote}</p>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="size-4 text-gray-400" />
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Upcoming (next 90 days) */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500" />
            Upcoming (next 90 days)
          </h3>
          <div className="space-y-2.5">
            {upcoming.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
          </div>
        </div>
      )}

      {/* Later this year */}
      {later.length > 0 && (
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-gray-400" />
            Later This Year
          </h3>
          <div className="space-y-2.5">
            {later.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="size-4 text-green-500" />
            Completed This Cycle
          </h3>
          <div className="space-y-2.5">
            {completed.map((d) => <DeadlineCard key={d.id} deadline={d} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && later.length === 0 && completed.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No deadlines match the selected filter.
        </div>
      )}
    </div>
  )
}
