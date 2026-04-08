'use client'

import Link from 'next/link'
import { ShieldCheck, ArrowRight, Bot, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ComplianceCalendarData, ComplianceDeadline } from '../../lib/registrar/compliance-calendar'

interface ComplianceWidgetProps {
  data: ComplianceCalendarData | null
  loading: boolean
}

const URGENCY_COLORS: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  warning: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  normal: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  safe: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

const CATEGORY_LABELS: Record<string, string> = {
  federal: 'Federal',
  accreditation: 'Accreditation',
  state: 'State',
  compliance: 'Compliance',
  operations: 'Operations',
}

function countdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function UrgencyIcon({ urgency }: { urgency: string }) {
  if (urgency === 'critical') return <AlertTriangle className="size-4 text-red-500" />
  if (urgency === 'warning') return <Clock className="size-4 text-amber-500" />
  return <CheckCircle className="size-4 text-green-500" />
}

function DeadlineRow({ deadline }: { deadline: ComplianceDeadline }) {
  const colors = URGENCY_COLORS[deadline.urgency] ?? URGENCY_COLORS.safe
  const dueDate = new Date(deadline.dueDate)

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UrgencyIcon urgency={deadline.urgency} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{deadline.name}</p>
            <p className="text-xs text-gray-500">
              {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              {deadline.agency}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
            {countdownLabel(deadline.daysUntil)}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
            {CATEGORY_LABELS[deadline.category] ?? deadline.category}
          </span>
        </div>
      </div>
      {/* Sandy note */}
      <div className="flex items-start gap-1.5 pl-6">
        <Bot className="size-3 text-[#0033A0] shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 italic leading-relaxed">{deadline.sandyNote}</p>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-gray-50 rounded-xl p-3 animate-pulse space-y-2">
      <div className="flex items-center gap-2">
        <div className="size-4 bg-gray-200 rounded-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="ml-auto h-4 bg-gray-200 rounded w-16" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-full ml-6" />
    </div>
  )
}

export default function ComplianceWidget({ data, loading }: ComplianceWidgetProps) {
  const displayDeadlines = data?.upcoming.slice(0, 4) ?? []

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-[#0033A0] flex items-center justify-center">
            <ShieldCheck className="size-4 text-white" />
          </div>
          <h2 className="font-extrabold text-gray-900">Compliance Calendar</h2>
        </div>
        <Link
          href="/registrar/compliance"
          className="text-xs font-medium text-[#0033A0] hover:underline flex items-center gap-1"
        >
          View All
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Content */}
      <div className="space-y-2.5">
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!loading && displayDeadlines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="size-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-gray-700">No upcoming deadlines in the next 90 days</p>
          </div>
        )}

        {!loading && displayDeadlines.map((d) => (
          <DeadlineRow key={d.id} deadline={d} />
        ))}
      </div>
    </div>
  )
}
