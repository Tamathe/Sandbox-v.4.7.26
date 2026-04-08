'use client'

import { useState } from 'react'

type ChoiceQuestion = {
  id: string
  prompt: string
  choices: { id: string; text: string }[]
}

type Props = {
  contentRef: { assessmentId?: string }
  questions?: ChoiceQuestion[]
  onSubmit?: (payload: Record<string, string>) => Promise<void> | void
}

export default function AssessmentLesson({ contentRef, questions = [], onSubmit }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!contentRef?.assessmentId) {
    return <p className="text-sm text-slate-500">Assessment not configured.</p>
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await onSubmit?.(answers)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {questions.length === 0 ? (
        <p className="text-sm text-slate-500">Loading questions…</p>
      ) : (
        questions.map((q) => (
          <fieldset key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <legend className="text-sm font-semibold text-slate-900">{q.prompt}</legend>
            <div className="mt-3 space-y-2">
              {q.choices.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name={q.id}
                    value={c.id}
                    checked={answers[q.id] === c.id}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                    disabled={submitted}
                  />
                  {c.text}
                </label>
              ))}
            </div>
          </fieldset>
        ))
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || submitted || questions.length === 0}
        className="rounded-full bg-[#0033A0] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#002577]"
      >
        {submitted ? 'Submitted ✓' : submitting ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  )
}
