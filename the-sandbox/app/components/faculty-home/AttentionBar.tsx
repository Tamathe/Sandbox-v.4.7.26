'use client'

// Attention Bar
// Replaces KPI Strip with intelligent priority surfacing.
// Pulls urgent items from email, tasks, grading, advising, and service into one
// scannable bar. "What needs my attention right now?"

import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck,
  FileSignature,
  Gavel,
  Mail,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { CappedList } from '../CappedList'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

interface UrgentEmail {
  id: string
  fromName: string
  subject: string
  summary?: string
}

interface OverdueTask {
  id: string
  title: string
}

interface PendingGrade {
  courseId: string
  courseCode: string
  count: number
}

interface AttentionStats {
  unreadEmails: number
  todayEvents: number
  pendingTasks: number
  overdueTasks: number
  adviseeHoldCount?: number
  committeeActionsDueSoon?: number
}

export interface SandySuggestionItem {
  courseCode: string
  reason: string
  onSend: () => void
}

interface AttentionBarProps {
  urgentEmails: UrgentEmail[]
  overdueTasks: OverdueTask[]
  pendingGrades: PendingGrade[]
  stats: AttentionStats
  gradingQueueStale?: number
  v2Data?: FacultyHomepageV2Data | null
  onEmailClick?: (emailId: string) => void
  onTaskComplete?: (taskId: string) => void
  onOpenGradingQueue?: () => void
  sandySuggestions?: SandySuggestionItem[]
}

export default function AttentionBar({
  urgentEmails,
  overdueTasks,
  pendingGrades,
  stats,
  gradingQueueStale = 0,
  v2Data,
  onEmailClick,
  onTaskComplete,
  onOpenGradingQueue,
  sandySuggestions = [],
}: AttentionBarProps) {
  const gradeTotal = pendingGrades.reduce((sum, grade) => sum + grade.count, 0)
  const gradingQueueCount =
    v2Data?.quickActions.pendingGradeCount ??
    (gradeTotal > 0 ? gradeTotal : gradingQueueStale)
  const adviseeHoldCount = v2Data?.advisees.withHolds ?? stats.adviseeHoldCount ?? 0
  const committeeActionsDueSoon =
    v2Data?.committees.reduce((sum, committee) => sum + committee.actionItemsDue, 0) ??
    stats.committeeActionsDueSoon ??
    0
  const recsComingDue = (v2Data?.recommendations ?? []).filter(
    (recommendation) => recommendation.daysUntilDue >= 0 && recommendation.daysUntilDue <= 7,
  ).length
  const totalUrgent =
    urgentEmails.length +
    overdueTasks.length +
    (gradeTotal > 0 ? pendingGrades.length : 0) +
    gradingQueueCount +
    adviseeHoldCount +
    committeeActionsDueSoon +
    recsComingDue +
    sandySuggestions.length

  if (totalUrgent === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-800">All clear</span>
      </div>
    )
  }

  // Sort items by urgency tier: grading > overdue tasks > advisee holds > emails > rest
  const sortedItems = [
    // Tier 1 — grading deadlines (highest urgency)
    ...pendingGrades.map((grade) => ({ type: 'grade' as const, grade, tier: 1 })),
    ...(gradingQueueCount > 0 ? [{ type: 'grading-queue' as const, count: gradingQueueCount, tier: 1 }] : []),
    // Tier 2 — overdue tasks
    ...overdueTasks.map((task) => ({ type: 'task' as const, task, tier: 2 })),
    // Tier 3 — advisee holds
    ...(adviseeHoldCount > 0 ? [{ type: 'advisee-holds' as const, count: adviseeHoldCount, tier: 3 }] : []),
    // Tier 4 — urgent emails
    ...urgentEmails.map((email) => ({ type: 'email' as const, email, tier: 4 })),
    // Tier 5 — everything else
    ...(committeeActionsDueSoon > 0 ? [{ type: 'committee-actions' as const, count: committeeActionsDueSoon, tier: 5 }] : []),
    ...(recsComingDue > 0 ? [{ type: 'recommendations' as const, count: recsComingDue, tier: 5 }] : []),
    // Tier 6 — Sandy suggestions (lowest urgency, proactive)
    ...sandySuggestions.map((suggestion, i) => ({ type: 'sandy-suggestion' as const, suggestion, tier: 6, _key: `sandy-${i}` })),
  ]

  return (
    <div className="rounded-2xl border border-gray-200 border-l-4 border-l-amber-400 bg-white px-5 py-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0 text-amber-500" />
        <span className="text-sm font-semibold text-gray-900">
          Needs attention
        </span>
      </div>

      <CappedList
        items={sortedItems}
        cap={4}
        noun="attention items"
        className="flex flex-wrap gap-2"
        renderItem={(item) => {
          if (item.type === 'email') {
            const email = item.email
            return (
              <button
                type="button"
                key={email.id}
                onClick={() => onEmailClick?.(email.id)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-red-100"
              >
                <Mail className="size-3.5 shrink-0 text-red-500" />
                <span className="max-w-[140px] truncate font-semibold text-gray-900">{email.fromName}</span>
                <span className="max-w-[200px] truncate text-gray-500">- {email.summary || email.subject}</span>
              </button>
            )
          }

          if (item.type === 'task') {
            const task = item.task
            return (
              <button
                type="button"
                key={task.id}
                onClick={() => onTaskComplete?.(task.id)}
                title="Mark as complete"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-amber-100"
              >
                <Clock className="size-3.5 shrink-0 text-amber-500" />
                <span className="max-w-[250px] truncate font-semibold text-gray-900">{task.title}</span>
                <span className="text-xs text-amber-500">overdue</span>
              </button>
            )
          }

          if (item.type === 'grade') {
            const grade = item.grade
            return (
              <Link
                key={grade.courseId}
                href={`/courses?course=${grade.courseId}&tab=gradebook`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-orange-50"
              >
                <FileCheck className="size-3.5 shrink-0 text-orange-500" />
                <span className="font-semibold text-gray-900">{grade.courseCode}</span>
                <span className="text-orange-600">{grade.count} to grade</span>
                <ArrowRight className="size-3 text-orange-400" />
              </Link>
            )
          }

          if (item.type === 'grading-queue') {
            return (
              <button
                key="grading-queue"
                type="button"
                onClick={onOpenGradingQueue}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-amber-50"
              >
                <ClipboardCheck className="size-3.5 shrink-0 text-amber-600" />
                <span className="font-semibold text-gray-900">{item.count} submissions</span>
                <span className="text-amber-700">need review</span>
              </button>
            )
          }

          if (item.type === 'advisee-holds') {
            return (
              <a
                key="advisee-holds"
                href="#faculty-my-students"
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-red-50"
              >
                <ShieldAlert className="size-3.5 shrink-0 text-red-600" />
                <span className="font-semibold text-gray-900">{item.count} advisee{item.count === 1 ? '' : 's'}</span>
                <span className="text-red-700">have holds</span>
              </a>
            )
          }

          if (item.type === 'committee-actions') {
            const nextAction = v2Data?.committees.find((c) => c.nextActionTitle)?.nextActionTitle
            return (
              <a
                key="committee-actions"
                href="#faculty-service-zone"
                className="inline-flex flex-col rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-purple-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Gavel className="size-3.5 shrink-0 text-purple-600" />
                  <span className="font-semibold text-gray-900">{item.count} committee action{item.count === 1 ? '' : 's'}</span>
                  <span className="text-purple-700">due</span>
                </span>
                {nextAction && (
                  <span className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{nextAction}</span>
                )}
              </a>
            )
          }

          if (item.type === 'recommendations') {
            return (
              <a
                key="recommendations"
                href="#faculty-recommendations"
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-blue-50"
              >
                <FileSignature className="size-3.5 shrink-0 text-blue-600" />
                <span className="font-semibold text-gray-900">{item.count} rec{item.count === 1 ? '' : 's'}</span>
                <span className="text-blue-700">due within 7 days</span>
              </a>
            )
          }

          if (item.type === 'sandy-suggestion') {
            return (
              <button
                key={item._key}
                type="button"
                onClick={item.suggestion.onSend}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#0033A0]/20 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-blue-50"
              >
                <Bot className="size-3.5 shrink-0 text-[#0033A0]" />
                <span className="font-semibold text-gray-900">{item.suggestion.courseCode}</span>
                <span className="max-w-[200px] truncate text-gray-500">{item.suggestion.reason}</span>
              </button>
            )
          }

          return null
        }}
      />
    </div>
  )
}
