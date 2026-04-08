// app/components/courses/TimelineDetailPanel.tsx
'use client'

import { useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  X, FileText, HelpCircle, GraduationCap, Folder, BookOpen,
  Presentation, FlaskConical, MessageSquare, Users, Circle,
  ExternalLink, Bot,
} from 'lucide-react'
import type { TimelineItem } from '../../lib/courses/timeline-service'

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-800' },
  graded: { label: 'Graded', className: 'bg-green-100 text-green-800' },
  upcoming: { label: 'Upcoming', className: 'bg-gray-100 text-gray-700' },
  'due-soon': { label: 'Due Soon', className: 'bg-amber-100 text-amber-800' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
}

interface TimelineDetailPanelProps {
  item: TimelineItem | null
  courseId: string
  onClose: () => void
}

export default function TimelineDetailPanel({ item, courseId, onClose }: TimelineDetailPanelProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  if (!item) return null

  const Icon = CATEGORY_ICONS[item.category] || Circle
  const statusCfg = STATUS_CONFIG[item.status]
  const dueDate = new Date(item.dueAt)

  function handleAskSandy() {
    window.dispatchEvent(new CustomEvent('sandy-prefill', {
      detail: {
        message: `Help me prepare for "${item!.title}" which is due ${format(dueDate, 'EEEE, MMMM d')}`,
        autoSend: true,
      },
    }))
  }

  function handleViewAssignment() {
    // Update URL search params to switch to assignments tab
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'assignments')
    url.searchParams.set('assignment', item!.id)
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col transition-transform duration-200 translate-x-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="flex items-center justify-center size-9 rounded-lg bg-gray-100">
            <Icon className="size-5 text-gray-600" />
          </div>
          <h3 className="flex-1 font-extrabold text-gray-900 text-lg leading-tight line-clamp-2">
            {item.title}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
              {item.category}
            </span>
            {item.pointsPossible && (
              <span className="text-xs text-gray-500">{item.pointsPossible} pts</span>
            )}
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-700">Due Date</p>
            <p className="text-sm text-gray-900">{format(dueDate, 'EEEE, MMMM d, yyyy · h:mm a')}</p>
            <p className="text-xs text-gray-500">{formatDistanceToNow(dueDate, { addSuffix: true })}</p>
          </div>

          {/* Submission info */}
          {item.submittedAt && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">Submitted</p>
              <p className="text-sm text-gray-900">{format(new Date(item.submittedAt), 'MMMM d, yyyy · h:mm a')}</p>
            </div>
          )}

          {/* Score */}
          {item.status === 'graded' && item.score !== null && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">Score</p>
              <p className="text-2xl font-extrabold text-green-700">
                {item.score}{item.pointsPossible ? ` / ${item.pointsPossible}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            type="button"
            onClick={handleViewAssignment}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="size-4" />
            View Assignment
          </button>
          <button
            type="button"
            onClick={handleAskSandy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0033A0] text-sm font-semibold text-white hover:bg-[#002280] transition-colors"
          >
            <Bot className="size-4" />
            Ask Sandy
          </button>
        </div>
      </div>
    </>
  )
}
