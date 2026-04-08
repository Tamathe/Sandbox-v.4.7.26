'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'

type Student = {
  id: string
  name: string
  email: string
}

type Props = {
  courseId: string
  userEmail: string
  students: Student[]
}

type FlagReason = 'grade_drop' | 'disengagement' | 'missing_sessions' | 'other'

const REASON_LABELS: Record<FlagReason, string> = {
  grade_drop: 'Grade Drop',
  disengagement: 'Disengagement',
  missing_sessions: 'Missing Sessions',
  other: 'Other',
}

type FlagState = {
  open: boolean
  reason: FlagReason
  note: string
  submitting: boolean
  flagged: boolean
}

const DEFAULT_FLAG: FlagState = {
  open: false,
  reason: 'grade_drop',
  note: '',
  submitting: false,
  flagged: false,
}

export default function StudentFlagPanel({ courseId, userEmail, students }: Props) {
  const [flagStates, setFlagStates] = useState<Record<string, FlagState>>({})
  const [showAll, setShowAll] = useState(false)

  function getState(id: string): FlagState {
    return flagStates[id] ?? DEFAULT_FLAG
  }

  function update(id: string, patch: Partial<FlagState>) {
    setFlagStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? DEFAULT_FLAG), ...patch },
    }))
  }

  function openForm(id: string) {
    // Close any other open forms
    const reset: Record<string, FlagState> = {}
    for (const key of Object.keys(flagStates)) {
      if (key !== id) {
        reset[key] = { ...(flagStates[key] ?? DEFAULT_FLAG), open: false }
      }
    }
    setFlagStates(prev => ({
      ...prev,
      ...reset,
      [id]: { ...(prev[id] ?? DEFAULT_FLAG), open: true, note: '', reason: 'grade_drop' },
    }))
  }

  async function submitFlag(student: Student) {
    const state = getState(student.id)
    update(student.id, { submitting: true })

    try {
      const res = await fetch('/api/analytics/faculty/flag-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          studentEmail: student.email,
          courseId,
          reason: state.reason,
          note: state.note.trim() || undefined,
        }),
      })

      if (!res.ok) {
        update(student.id, { submitting: false })
        return
      }

      update(student.id, { submitting: false, open: false, flagged: true })

      // Reset the "Flagged ✓" chip after 3s
      setTimeout(() => {
        update(student.id, { flagged: false })
      }, 3000)
    } catch {
      update(student.id, { submitting: false })
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Flag className="size-4 text-red-500" />
        <h3 className="font-bold text-gray-900">Quick Flag</h3>
        <span className="ml-auto text-xs text-gray-400">{students.length} students</span>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Flag a student for follow-up — logged to Intervention Tracker
      </p>

      <div className="divide-y divide-gray-100">
        {(showAll ? students : students.slice(0, 4)).map(student => {
          const state = getState(student.id)
          return (
            <div key={student.id} className="py-3">
              {/* Row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-400 truncate">{student.email}</p>
                </div>

                {state.flagged && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                    Flagged ✓
                  </span>
                )}

                {!state.flagged && (
                  <button
                    type="button"
                    onClick={() => (state.open ? update(student.id, { open: false }) : openForm(student.id))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
                  >
                    <Flag className="size-3" />
                    Flag
                  </button>
                )}
              </div>

              {/* Inline form */}
              {state.open && (
                <div className="mt-3 ml-0 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Reason
                    </label>
                    <select
                      value={state.reason}
                      onChange={e => update(student.id, { reason: e.target.value as FlagReason })}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    >
                      {(Object.keys(REASON_LABELS) as FlagReason[]).map(r => (
                        <option key={r} value={r}>
                          {REASON_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Note <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={300}
                      placeholder="Add context for this flag…"
                      value={state.note}
                      onChange={e => update(student.id, { note: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                    <p className="text-right text-xs text-gray-400 mt-0.5">
                      {state.note.length}/300
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => submitFlag(student)}
                      disabled={state.submitting}
                      className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      <Flag className="size-3" />
                      {state.submitting ? 'Flagging…' : 'Flag Student'}
                    </button>
                    <button
                      type="button"
                      onClick={() => update(student.id, { open: false })}
                      className="text-xs font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!showAll && students.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          Show all {students.length} students
        </button>
      )}
    </div>
  )
}
