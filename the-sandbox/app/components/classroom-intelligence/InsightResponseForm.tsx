'use client'

import React, { useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { Approach } from '../../lib/classroom-intelligence/types'

const ALL_APPROACHES: Approach[] = [
  'RE_EXPLAIN',
  'VISUAL_AID',
  'PRACTICE_EXERCISE',
  'STUDY_GROUP',
  'PEER_TEACHING',
  'OFFICE_HOURS',
  'FLASHCARD_SET',
  'SCAFFOLD_TASK',
  'REAL_WORLD_EXAMPLE',
  'ASSESSMENT_ADJUST',
  'SANDY_REVIEW',
  'CUSTOM',
]

interface InsightResponseFormProps {
  insightId: string
  concepts: string[]
  courseId: string
  onSubmit: () => void
  onCancel: () => void
}

export default function InsightResponseForm({
  insightId,
  concepts,
  courseId,
  onSubmit,
  onCancel,
}: InsightResponseFormProps) {
  const { currentUser } = useAuth()
  const [approach, setApproach] = useState<Approach>('RE_EXPLAIN')
  const [description, setDescription] = useState('')
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(concepts)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleConcept(c: string) {
    setSelectedConcepts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser?.email) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(currentUser.email, `/api/classroom-intelligence/insights/${insightId}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          approach,
          description,
          concepts: selectedConcepts,
          courseId,
        }),
      })
      onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-2xl shadow-sm p-5 space-y-4 max-w-6xl">
      <h3 className="font-extrabold text-lg text-gray-900">Respond to Insight</h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Approach */}
      <div>
        <label htmlFor="approach" className="block text-sm font-semibold text-gray-700 mb-1">
          Approach
        </label>
        <select
          id="approach"
          value={approach}
          onChange={(e) => setApproach(e.target.value as Approach)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
        >
          {ALL_APPROACHES.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="desc" className="block text-sm font-semibold text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
          placeholder="Describe your planned intervention…"
        />
      </div>

      {/* Target Concepts */}
      {concepts.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Target Concepts</p>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <label
                key={c}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  selectedConcepts.includes(c)
                    ? 'bg-[#0033A0] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedConcepts.includes(c)}
                  onChange={() => toggleConcept(c)}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#0033A0]/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Response'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
