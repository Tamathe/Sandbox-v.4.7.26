'use client'

import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react'
import { INACTIVE_DAYS_THRESHOLD, MISSED_ASSIGNMENT_CAP_THRESHOLD } from '../../lib/student-risk-constants'
import type { TabId } from './course-types'
import type { CourseSummaryItem } from '../../lib/course-summary-service'

interface ActionRequiredCardProps {
  summary: CourseSummaryItem
  onTabChange: (tab: TabId) => void
}

export default function ActionRequiredCard({ summary, onTabChange }: ActionRequiredCardProps) {
  const rows: Array<{
    icon: typeof ClipboardCheck
    label: string
    tab: TabId
    urgency: number
  }> = []

  if (summary.ungradedCount > 0) {
    rows.push({
      icon: ClipboardCheck,
      label: `${summary.ungradedCount} submission${summary.ungradedCount !== 1 ? 's' : ''} to grade`,
      tab: 'grades',
      urgency: 1,
    })
  }

  if (summary.unansweredDiscussions > 0) {
    rows.push({
      icon: MessageSquare,
      label: `${summary.unansweredDiscussions} unanswered discussion${summary.unansweredDiscussions !== 1 ? 's' : ''}`,
      tab: 'discussion',
      urgency: 2,
    })
  }

  if (summary.upcomingDeadlines.length > 0) {
    const next = summary.upcomingDeadlines[0]
    const dueDate = new Date(next.dueAt)
    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    rows.push({
      icon: Calendar,
      label: `${next.title} due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
      tab: 'assignments',
      urgency: 3,
    })
  }

  if (summary.atRiskInactive7d > 0) {
    rows.push({
      icon: AlertTriangle,
      label: `${summary.atRiskInactive7d} student${summary.atRiskInactive7d !== 1 ? 's' : ''} inactive ${INACTIVE_DAYS_THRESHOLD}+ days`,
      tab: 'overview',
      urgency: 4,
    })
  }

  if (summary.atRiskMissed2plus > 0) {
    rows.push({
      icon: AlertTriangle,
      label: `${summary.atRiskMissed2plus} student${summary.atRiskMissed2plus !== 1 ? 's' : ''} missed ${MISSED_ASSIGNMENT_CAP_THRESHOLD}+ assignments`,
      tab: 'overview',
      urgency: 5,
    })
  }

  if (rows.length === 0) return null

  rows.sort((a, b) => a.urgency - b.urgency)

  return (
    <div className="border-l-4 border-amber-400 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-extrabold text-gray-900">Action Required</h3>
      <div className="space-y-1">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <button
              key={row.label}
              type="button"
              onClick={() => onTabChange(row.tab)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Icon className="size-4 shrink-0 text-amber-600" />
              <span className="flex-1 text-left">{row.label}</span>
              <ChevronRight className="size-3.5 text-gray-400" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
