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

interface InterventionFormProps {
  courseId: string
  onSubmit: () => void
  onCancel: () => void
  defaultConcepts?: string[]
}

export default function InterventionForm({
  courseId,
  onSubmit,
  onCancel,
  defaultConcepts,
}: InterventionFormProps) {
  const { currentUser } = useAuth()
  const [approach, setApproach] = useState<Approach>('RE_EXPLAIN')
  const [description, setDescription] = useState('')
  const [conceptsInput, setConceptsInput] = useState(
    defaultConcepts?.join(', ') ?? '',
  )
  const [targetWeek, setTargetWeek] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser?.email) return
    setSubmitting(true)
    setError(null)
    try {
      const concepts = conceptsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      await apiFetch(currentUser.email, '/api/classroom-intelligence/interventions', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          approach,
          description,
          targetConcepts: concepts,
          targetWeek: targetWeek ? Number(targetWeek) : undefined,
        }),
      })
      onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create intervention')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-2xl shadow-sm p-5 space-y-4 max-w-6xl">
      <h3 className="font-extrabold text-lg text-gray-900">Record Intervention</h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Approach */}
      <div>
        <label htmlFor="iv-approach" className="block text-sm font-semibold text-gray-700 mb-1">
          Approach
        </label>
        <select
          id="iv-approach"
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
        <label htmlFor="iv-desc" className="block text-sm font-semibold text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="iv-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
          placeholder="Describe the intervention…"
        />
      </div>

      {/* Concepts */}
      <div>
        <label htmlFor="iv-concepts" className="block text-sm font-semibold text-gray-700 mb-1">
          Target Concepts (comma separated)
        </label>
        <input
          id="iv-concepts"
          type="text"
          value={conceptsInput}
          onChange={(e) => setConceptsInput(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
          placeholder="e.g. recursion, binary trees, graph traversal"
        />
      </div>

      {/* Target Week */}
      <div>
        <label htmlFor="iv-week" className="block text-sm font-semibold text-gray-700 mb-1">
          Target Week (optional)
        </label>
        <input
          id="iv-week"
          type="number"
          min={1}
          value={targetWeek}
          onChange={(e) => setTargetWeek(e.target.value)}
          className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
          placeholder="Week #"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#0033A0]/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Record Intervention'}
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
