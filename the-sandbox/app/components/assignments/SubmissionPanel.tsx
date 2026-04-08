'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import DynamicMarkdown from '../DynamicMarkdown'
import { useAuth } from '../../lib/auth-context'

import type { RubricCriterion } from '../courses/course-types'

interface SubmissionPanelProps {
  assignmentId: string
  draft: string
  rubricCriteria: Pick<RubricCriterion, 'id' | 'title' | 'maxPoints'>[]
  pointsPossible: number
  alreadySubmitted: boolean
  acceptingLate: boolean
  isPastDue: boolean
  onSubmitted: () => void
}

export default function SubmissionPanel({
  assignmentId,
  draft,
  rubricCriteria,
  pointsPossible,
  alreadySubmitted,
  acceptingLate,
  isPastDue,
  onSubmitted,
}: SubmissionPanelProps) {
  const { currentUser } = useAuth()
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(alreadySubmitted)

  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length
  const allChecked = rubricCriteria.length === 0 || rubricCriteria.every((c) => checks[c.id])
  const canSubmit = draft.trim().length > 0 && allChecked && !submitted && (!isPastDue || acceptingLate)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ textContent: draft }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Submission failed')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      onSubmitted()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h3 className="mb-2 text-lg font-extrabold text-gray-900">Submitted!</h3>
        <p className="text-sm text-gray-500">
          Your work has been submitted. Your instructor will review it and provide feedback.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 space-y-5 p-5">
        {/* Draft preview */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Your Response</h3>
            <span className="text-xs text-gray-400">{wordCount} words</span>
          </div>
          {draft.trim() ? (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4 prose prose-sm max-w-none text-gray-700">
              <DynamicMarkdown>{draft}</DynamicMarkdown>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              No draft written yet. Switch to the Draft tab to write your response.
            </div>
          )}
        </div>

        {/* Rubric self-check */}
        {rubricCriteria.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-800">Before you submit, confirm:</h3>
            <div className="space-y-2">
              {rubricCriteria.map((criterion) => {
                const weight = pointsPossible > 0
                  ? Math.round((criterion.maxPoints / pointsPossible) * 100)
                  : 0
                return (
                  <label
                    key={criterion.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={checks[criterion.id] ?? false}
                      onChange={(e) => setChecks((prev) => ({ ...prev, [criterion.id]: e.target.checked }))}
                      className="mt-0.5 size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                    />
                    <span className="text-sm text-gray-700">
                      I addressed <strong>{criterion.title}</strong> ({weight}%)
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Past due warning */}
        {isPastDue && acceptingLate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This assignment is past due but still accepting late submissions.
          </div>
        )}
        {isPastDue && !acceptingLate && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This assignment is past due and no longer accepting submissions.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="border-t border-gray-100 p-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit Assignment
        </button>
      </div>
    </div>
  )
}
