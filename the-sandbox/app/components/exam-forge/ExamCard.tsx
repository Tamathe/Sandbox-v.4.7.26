'use client'

import { Calendar, Clock, FlaskConical, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface ExamCardProps {
  assignment: {
    id: string
    title: string
    dueAt: string | null
    category: string | null
    pointsPossible: number
  }
  courseId: string
  generating: boolean
  onGenerate: (assignmentId: string) => void
}

export default function ExamCard({ assignment, generating, onGenerate }: ExamCardProps) {
  const dueDate = assignment.dueAt ? new Date(assignment.dueAt) : null
  const daysUntil = dueDate
    ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const urgencyColor =
    daysUntil !== null && daysUntil <= 3
      ? 'border-red-300 bg-red-50'
      : daysUntil !== null && daysUntil <= 7
        ? 'border-amber-300 bg-amber-50'
        : 'border-gray-200 bg-white'

  return (
    <div className={`border-2 rounded-2xl p-4 ${urgencyColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 truncate">{assignment.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {format(dueDate, 'MMM d, yyyy')}
              </span>
            )}
            {daysUntil !== null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {daysUntil <= 0 ? 'Past due' : `${daysUntil}d left`}
              </span>
            )}
            {assignment.category && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium capitalize">
                {assignment.category}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onGenerate(assignment.id)}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FlaskConical className="size-4" />
          )}
          {generating ? 'Generating…' : 'Practice'}
        </button>
      </div>
    </div>
  )
}
