'use client'

import { CheckCircle, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getSubmissionSnapshot } from './course-data'

const SUBMISSION_METRIC_COLORS = {
  neutral: 'bg-gray-100 text-gray-700',
  good: 'bg-green-100 text-green-700',
  warn: 'bg-amber-100 text-amber-700',
} as const

const SUBMISSION_STATUS_COLORS = {
  Strong: 'bg-green-100 text-green-700',
  'On Track': 'bg-blue-100 text-blue-700',
  'Needs Review': 'bg-amber-100 text-amber-700',
  Missing: 'bg-gray-100 text-gray-600',
} as const

interface SubmissionsTabProps {
  courseCode: string | undefined
}

export default function SubmissionsTab({ courseCode }: SubmissionsTabProps) {
  const snapshot = getSubmissionSnapshot(courseCode)

  if (!snapshot) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto mb-3 size-10 text-gray-200" />
        <h3 className="mb-1 text-sm font-semibold text-gray-600">No submission snapshot yet</h3>
        <p className="text-xs text-gray-400">
          Submission signals will appear here once students begin completing assignments.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.summary.map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              {metric.label}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-2xl font-semibold text-gray-900">{metric.value}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SUBMISSION_METRIC_COLORS[metric.tone]}`}>
                {metric.tone === 'good' ? 'Healthy' : metric.tone === 'warn' ? 'Watch' : 'Info'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Assignment snapshot */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="size-5 text-[#0033A0]" />
          Assignment Snapshot
        </div>
        <div className="space-y-3">
          {snapshot.assignments.map((assignment) => (
            <div
              key={assignment.assignment}
              className="grid gap-3 rounded-2xl border border-gray-200 px-4 py-4 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))] md:items-center"
            >
              <div>
                <div className="font-semibold text-gray-900">{assignment.assignment}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Submitted</div>
                <div className="mt-1 text-sm font-medium text-gray-700">{assignment.submitted}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Average</div>
                <div className="mt-1 text-sm font-medium text-gray-700">{assignment.average}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Follow-up</div>
                <div className="mt-1 text-sm font-medium text-gray-700">{assignment.flagged}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent submission signals */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <CheckCircle className="size-5 text-[#0033A0]" />
          Recent Submission Signals
        </div>
        <div className="space-y-4">
          {snapshot.recentSubmissions.map((submission) => (
            <div
              key={`${submission.studentName}-${submission.assignment}`}
              className="rounded-2xl border border-gray-200 px-4 py-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-gray-900">{submission.studentName}</div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SUBMISSION_STATUS_COLORS[submission.status]}`}>
                      {submission.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{submission.assignment}</div>
                </div>
                <div className="text-sm text-gray-500">
                  {submission.submittedAt
                    ? `Submitted ${formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}`
                    : 'Not submitted'}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                  {submission.score}
                </div>
                <div className="text-gray-600">{submission.feedback}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
        Submission and grading signals are synthetic demo data for the MVP, illustrating how an educator-facing review workflow could feel before a full submissions backend ships.
      </div>
    </div>
  )
}
