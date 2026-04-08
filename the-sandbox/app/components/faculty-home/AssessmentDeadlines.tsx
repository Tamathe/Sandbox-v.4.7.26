import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, BarChart3 } from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

interface AssessmentDeadlinesProps {
  assessmentDeadlines: FacultyHomepageV2Data['assessmentDeadlines']
}

const scopeStyles = {
  COURSE: 'bg-blue-100 text-blue-700',
  DEPARTMENT: 'bg-purple-100 text-purple-700',
  INSTITUTION: 'bg-slate-100 text-slate-700',
} satisfies Record<FacultyHomepageV2Data['assessmentDeadlines'][number]['scope'], string>

export default function AssessmentDeadlines({ assessmentDeadlines }: AssessmentDeadlinesProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0]">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Assessment Deadlines</h3>
            <p className="text-sm text-gray-500">Compliance work that still lands on faculty shoulders.</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
          {assessmentDeadlines.length} upcoming
        </span>
      </div>

      {assessmentDeadlines.length > 0 ? (
        <div className="mt-5 space-y-3">
          {assessmentDeadlines.map((deadline) => (
            <div key={deadline.id} className="rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{deadline.title}</p>
                  <p className="mt-1 text-sm text-gray-600">Due: {format(new Date(deadline.dueDate), 'MMM d')}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scopeStyles[deadline.scope]}`}>
                  {deadline.scope.toLowerCase()}
                </span>
              </div>

              {deadline.progress || deadline.courseCode ? (
                <p className="mt-3 text-sm text-gray-600">
                  {deadline.progress ?? 'Progress tracking not available yet'}
                  {deadline.courseCode ? (
                    <>
                      {' · '}
                      <span className="font-semibold text-gray-700">{deadline.courseCode}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          No assessment deadlines right now.
        </p>
      )}

      <Link
        href="/compliance"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#00277A]"
      >
        View compliance portal
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
