'use client'

import DynamicMarkdown from '../DynamicMarkdown'
import { Calendar, CheckCircle2, Clock, FileText, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

import type { RubricCriterion } from '../courses/course-types'

interface AssignmentBriefProps {
  assignment: {
    title: string
    courseCode: string
    courseName: string
    description: string | null
    dueAt: string | null
    dueLabel: string
    urgency: 'critical' | 'warning' | 'info'
    pointsPossible: number
    rubric: { criteria: RubricCriterion[] } | null
  }
  submission: {
    status: 'not-started' | 'draft' | 'submitted' | 'graded'
    submittedAt: string | null
    grade: string | null
    feedback: string | null
  }
  onStartDraft: () => void
}

const URGENCY_STYLES = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  'not-started': { label: 'Not started', className: 'bg-gray-100 text-gray-600' },
  draft: { label: 'Draft saved', className: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-700' },
  graded: { label: 'Graded', className: 'bg-blue-100 text-blue-700' },
}

export default function AssignmentBrief({ assignment, submission, onStartDraft }: AssignmentBriefProps) {
  const statusBadge = STATUS_BADGES[submission.status] ?? STATUS_BADGES['not-started']

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 space-y-5 p-5">
        {/* Course badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-semibold text-[#0033A0]">
            {assignment.courseCode}
          </span>
          <span className="text-xs text-gray-400">{assignment.courseName}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-extrabold text-gray-900">{assignment.title}</h1>

        {/* Due date + points */}
        <div className="flex flex-wrap items-center gap-3">
          {assignment.dueAt && (
            <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${URGENCY_STYLES[assignment.urgency]}`}>
              {assignment.urgency === 'critical' ? <AlertCircle className="size-3.5" /> : <Calendar className="size-3.5" />}
              {assignment.dueLabel}
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-600">
            <FileText className="size-3.5" />
            {assignment.pointsPossible} pts
          </div>
          <div className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusBadge.className}`}>
            {statusBadge.label}
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <div className="prose prose-sm max-w-none text-gray-700">
            <h3 className="text-sm font-bold text-gray-800">Instructions</h3>
            <DynamicMarkdown>{assignment.description}</DynamicMarkdown>
          </div>
        )}

        {/* Rubric */}
        {assignment.rubric && assignment.rubric.criteria.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-800">Rubric</h3>
            <div className="space-y-2">
              {assignment.rubric.criteria.map((criterion) => {
                const weight = assignment.pointsPossible > 0
                  ? Math.round((criterion.maxPoints / assignment.pointsPossible) * 100)
                  : 0
                return (
                  <div key={criterion.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">{criterion.title}</span>
                      <span className="text-xs text-gray-500">{criterion.maxPoints} pts ({weight}%)</span>
                    </div>
                    {criterion.description && (
                      <p className="mt-1 text-xs text-gray-500">{criterion.description}</p>
                    )}
                    {criterion.bands.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {criterion.bands.map((band) => (
                          <span
                            key={band.label}
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm"
                            title={band.description}
                          >
                            {band.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Graded feedback */}
        {submission.status === 'graded' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-blue-800">
              <CheckCircle2 className="size-4" />
              Grade: {submission.grade}/{assignment.pointsPossible}
            </div>
            {submission.feedback && (
              <p className="text-sm text-blue-700">{submission.feedback}</p>
            )}
          </div>
        )}

        {/* Submitted info */}
        {submission.status === 'submitted' && submission.submittedAt && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="size-4" />
            Submitted {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
          </div>
        )}
      </div>

      {/* Bottom action */}
      {submission.status === 'not-started' && (
        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onStartDraft}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <FileText className="size-4" />
            Start Draft
          </button>
        </div>
      )}
    </div>
  )
}
