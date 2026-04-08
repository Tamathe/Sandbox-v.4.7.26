'use client'

import { useState, useEffect } from 'react'
import { Brain, X, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DueConcept = {
  conceptSlug: string
  courseCode: string
  bloomHighWater: number
  missedReviews: number
  nextReviewAt: string
}

type NudgeData = {
  dueCount: number
  overdueCount: number
  dueConcepts: DueConcept[]
}

type Verdict = 'correct' | 'partial' | 'incorrect'

// ─── ReviewModal ──────────────────────────────────────────────────────────────

function ReviewModal({
  concepts,
  userEmail,
  onClose,
}: {
  concepts: DueConcept[]
  userEmail: string
  onClose: () => void
}) {
  const [conceptIndex, setConceptIndex] = useState(0)
  const [turnNumber, setTurnNumber] = useState(1)
  const [question, setQuestion] = useState<string | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [reviewedConcepts, setReviewedConcepts] = useState<string[]>([])

  const current = concepts[conceptIndex]
  const MAX_CONCEPTS = Math.min(3, concepts.length)

  // Fetch question on mount + when concept changes
  useEffect(() => {
    if (!current) return
    setLoading(true)
    setError(null)
    setQuestion(null)
    setUserAnswer('')
    setVerdict(null)
    setFeedback(null)
    setTurnNumber(1)

    fetch('/api/analytics/student/sr-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': userEmail,
      },
      body: JSON.stringify({
        conceptSlug: current.conceptSlug,
        courseCode: current.courseCode,
        turnNumber: 1,
      }),
    })
      .then(r => r.json())
      .then((data: { question?: string; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setQuestion(data.question ?? '')
      })
      .catch((e: Error) => setError(e.message ?? 'Failed to generate question'))
      .finally(() => setLoading(false))
  }, [conceptIndex, current, userEmail])

  async function handleSubmitAnswer() {
    if (!userAnswer.trim() || !current) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/analytics/student/sr-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          conceptSlug: current.conceptSlug,
          courseCode: current.courseCode,
          userAnswer,
          turnNumber: 2,
        }),
      })
      const data = await res.json() as { verdict?: Verdict; feedback?: string; error?: string }
      if (data.error) throw new Error(data.error)
      setVerdict(data.verdict ?? 'incorrect')
      setFeedback(data.feedback ?? '')
      setTurnNumber(3)
      setReviewedConcepts(prev => [...prev, current.conceptSlug])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to score answer'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (conceptIndex + 1 >= MAX_CONCEPTS) {
      setCompleted(true)
    } else {
      setConceptIndex(i => i + 1)
    }
  }

  if (completed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 w-full max-w-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="size-5 text-[#0033A0]" />
              <h2 className="font-extrabold text-gray-900">Session Complete</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="size-5" />
            </button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-green-800 font-semibold text-sm">
              Great work! You reviewed {reviewedConcepts.length} concept{reviewedConcepts.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <div className="space-y-2 mb-4">
            {reviewedConcepts.map(slug => (
              <div key={slug} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="size-4 text-green-500 flex-shrink-0" />
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{slug}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-[#0033A0] text-white py-2.5 rounded-xl font-semibold hover:bg-[#002280] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 w-full max-w-lg">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-[#0033A0]" />
            <h2 className="font-extrabold text-gray-900">Spaced Repetition Review</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Concept badge */}
          {current && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-[#0033A0]/10 text-[#0033A0] px-3 py-1 rounded-full">
                {current.conceptSlug}
              </span>
              <span className="text-xs text-gray-500">{current.courseCode}</span>
              <span className="ml-auto text-xs text-gray-400">
                {conceptIndex + 1} / {MAX_CONCEPTS}
              </span>
            </div>
          )}

          {/* Loading question */}
          {loading && !question && (
            <div className="flex items-center gap-2 text-gray-500 py-4">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Generating question…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Question */}
          {question && !loading && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 leading-relaxed">{question}</p>
            </div>
          )}

          {/* Answer input — only show before scoring */}
          {question && verdict === null && (
            <div className="space-y-3">
              <textarea
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="Type your answer…"
                rows={3}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
              />
              <button
                onClick={() => { void handleSubmitAnswer() }}
                disabled={!userAnswer.trim() || loading}
                className="w-full bg-[#0033A0] text-white py-2.5 rounded-xl font-semibold hover:bg-[#002280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Submit Answer
              </button>
            </div>
          )}

          {/* Verdict */}
          {verdict && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
                verdict === 'correct'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : verdict === 'partial'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {verdict === 'correct' && <CheckCircle className="size-4 flex-shrink-0" />}
                {verdict === 'partial' && <AlertCircle className="size-4 flex-shrink-0" />}
                {verdict === 'incorrect' && <XCircle className="size-4 flex-shrink-0" />}
                <span className="text-sm font-semibold capitalize">{verdict}</span>
              </div>
              {feedback && (
                <p className="text-sm text-gray-600 leading-relaxed">{feedback}</p>
              )}
              <button
                onClick={handleNext}
                className="w-full bg-[#0033A0] text-white py-2.5 rounded-xl font-semibold hover:bg-[#002280] transition-colors"
              >
                {conceptIndex + 1 >= MAX_CONCEPTS ? 'View Summary' : 'Next Concept'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SRNudgeWidget ────────────────────────────────────────────────────────────

export default function SRNudgeWidget({ userEmail }: { userEmail: string }) {
  const [data, setData] = useState<NudgeData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/analytics/student/sr-nudge', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.json())
      .then((d: NudgeData) => setData(d))
      .catch(() => {})
  }, [userEmail])

  if (!data || data.dueCount === 0) return null

  const badgeColor = data.dueCount >= 5
    ? 'bg-red-500 text-white'
    : 'bg-amber-400 text-white'

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 mb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Brain className="size-4 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Spaced Repetition Due</h3>
          <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {data.dueCount}
          </span>
          {data.overdueCount > 0 && (
            <span className="text-xs text-red-600 font-medium ml-1">
              {data.overdueCount} overdue
            </span>
          )}
        </div>

        {/* Concept pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {data.dueConcepts.slice(0, 3).map(c => (
            <div
              key={`${c.courseCode}-${c.conceptSlug}`}
              className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1"
            >
              <span className="text-xs font-medium text-amber-900 font-mono">{c.conceptSlug}</span>
              <span className="text-xs text-amber-600">{c.courseCode}</span>
              {c.missedReviews > 0 && (
                <span className="text-xs text-red-500 font-semibold">+{c.missedReviews}</span>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#0033A0] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#002280] transition-colors"
        >
          Review Now
        </button>
      </div>

      {modalOpen && (
        <ReviewModal
          concepts={data.dueConcepts}
          userEmail={userEmail}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
