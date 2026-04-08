'use client'

import { useState } from 'react'
import { Send, X, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface CaseStudySubmitFormProps {
  onClose: () => void
  onSubmitted: () => void
}

const DISCIPLINES = [
  'Biology', 'Chemistry', 'Computer Science', 'Economics', 'Education',
  'Engineering', 'English', 'History', 'Law', 'Mathematics', 'Medicine',
  'Nursing', 'Philosophy', 'Physics', 'Political Science', 'Psychology',
  'Sociology', 'Other',
]

const STANCE_RANGES = [
  'Prohibit', 'Cautious', 'Cautious–Guided', 'Guided', 'Guided–Integrate', 'Integrate', 'Require',
]

export default function CaseStudySubmitForm({ onClose, onSubmitted }: CaseStudySubmitFormProps) {
  const { currentUser } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    discipline: '',
    stanceRange: '',
    challenge: '',
    approach: '',
    outcome: '',
    lessonsLearned: '',
  })

  const canSubmit = form.title && form.discipline && form.challenge && form.approach && form.outcome

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    const res = await fetch('/api/ai-literacy/case-studies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({
        ...form,
        lessonsLearned: form.lessonsLearned
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean),
      }),
    })

    setSubmitting(false)
    if (res.ok) onSubmitted()
  }

  return (
    <div className="border rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Share Your Experience</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Share an anonymized case study from your teaching. Submissions are reviewed before publishing.
      </p>

      <div className="space-y-3">
        <input
          placeholder="Title (e.g., 'Redesigning the Term Paper in Organic Chemistry')"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.discipline}
            onChange={e => setForm(f => ({ ...f, discipline: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#0033A0] outline-none"
          >
            <option value="">Discipline</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={form.stanceRange}
            onChange={e => setForm(f => ({ ...f, stanceRange: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#0033A0] outline-none"
          >
            <option value="">Stance range (optional)</option>
            {STANCE_RANGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <textarea
          placeholder="Challenge — What problem were you facing with AI in your course?"
          value={form.challenge}
          onChange={e => setForm(f => ({ ...f, challenge: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
        />

        <textarea
          placeholder="Approach — What did you do about it?"
          value={form.approach}
          onChange={e => setForm(f => ({ ...f, approach: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
        />

        <textarea
          placeholder="Outcome — What happened? What changed?"
          value={form.outcome}
          onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
        />

        <textarea
          placeholder="Lessons learned (one per line)"
          value={form.lessonsLearned}
          onChange={e => setForm(f => ({ ...f, lessonsLearned: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex items-center gap-2 px-5 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit for Review
        </button>
      </div>
    </div>
  )
}
