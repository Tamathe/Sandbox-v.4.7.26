'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../lib/auth-context'
import {
  Brain,
  CheckCircle2,
  XCircle,
  SkipForward,
  Send,
  Lightbulb,
  Clock,
  Loader2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewData {
  id: string
  question: string
  bloomLevel: number
  conceptSlug: string
  conceptLabel: string
  courseName: string
  daysOverdue: number
}

interface SubmitResult {
  skipped?: boolean
  correct?: boolean
  feedback?: string
  hint?: string
  correctAnswer?: string
  nextReviewIn?: string
}

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

const BLOOM_COLORS: Record<number, string> = {
  1: 'bg-gray-100 text-gray-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-amber-100 text-amber-700',
  5: 'bg-purple-100 text-purple-700',
  6: 'bg-rose-100 text-rose-700',
}

function getThrottleKey(courseId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `micro-review-${courseId}-${today}`
}

// ── Inline Card Component ─────────────────────────────────────────────────────

export default function MicroReviewInlineCard({
  courseId,
  onDismiss,
}: {
  courseId: string
  onDismiss: () => void
}) {
  const { currentUser } = useAuth()
  const isStudent = currentUser.role === 'STUDENT'
  const [review, setReview] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [startTime] = useState(Date.now())
  const [dismissed, setDismissed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check localStorage throttle + fetch review
  useEffect(() => {
    if (!isStudent) {
      setDismissed(true)
      return
    }
    const throttleKey = getThrottleKey(courseId)
    if (typeof window !== 'undefined' && localStorage.getItem(throttleKey)) {
      setDismissed(true)
      return
    }

    fetch(`/api/micro-review?courseId=${encodeURIComponent(courseId)}`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.available && data.review) {
          setReview(data.review)
        } else {
          setDismissed(true)
        }
      })
      .catch(() => setDismissed(true))
      .finally(() => setLoading(false))
  }, [courseId, currentUser.email, isStudent])

  const setThrottle = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getThrottleKey(courseId), '1')
    }
  }, [courseId])

  const handleSubmit = useCallback(async () => {
    if (!review || submitting) return
    setSubmitting(true)
    try {
      const responseTimeMs = Date.now() - startTime
      const res = await fetch(`/api/micro-review/${review.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ answer, responseTimeMs }),
      })
      const data: SubmitResult = await res.json()
      setResult(data)
      setThrottle()
    } catch {
      setThrottle()
      setDismissed(true)
      onDismiss()
    } finally {
      setSubmitting(false)
    }
  }, [review, answer, submitting, currentUser.email, startTime, setThrottle, onDismiss])

  const handleSkip = useCallback(async () => {
    if (!review || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/micro-review/${review.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ skipped: true }),
      })
      setThrottle()
    } catch {
      // ignore
    }
    setDismissed(true)
    onDismiss()
  }, [review, submitting, currentUser.email, onDismiss, setThrottle])

  const handleDismiss = useCallback(() => {
    setThrottle()
    setDismissed(true)
    onDismiss()
  }, [onDismiss, setThrottle])

  if (dismissed || loading || !review) return null

  const bloomLabel = BLOOM_LABELS[review.bloomLevel] ?? 'Understand'
  const bloomColor = BLOOM_COLORS[review.bloomLevel] ?? BLOOM_COLORS[2]

  // ── Result view (after submit) ──────────────────────────────────────────────
  if (result && !result.skipped) {
    return (
      <div className="mx-4 mb-3 rounded-2xl border-2 border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          {result.correct ? (
            <>
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="text-sm font-bold text-green-700">Correct!</span>
            </>
          ) : (
            <>
              <XCircle className="size-5 text-red-600" />
              <span className="text-sm font-bold text-red-700">Not quite</span>
            </>
          )}
          {result.nextReviewIn && (
            <span className="ml-auto text-xs text-gray-400">
              Next review: {result.nextReviewIn}
            </span>
          )}
        </div>

        {result.feedback && (
          <p className="mb-2 text-xs text-gray-600">{result.feedback}</p>
        )}

        {result.correctAnswer && (
          <div className="mb-2 rounded-lg bg-gray-50 p-2">
            <p className="text-xs font-semibold text-gray-500">Expected answer</p>
            <p className="text-xs text-gray-700">{result.correctAnswer}</p>
          </div>
        )}

        {result.hint && (
          <div className="mb-2 flex gap-1.5 rounded-lg bg-amber-50 p-2">
            <Lightbulb className="mt-0.5 size-3 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">{result.hint}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    )
  }

  // ── Question view ───────────────────────────────────────────────────────────
  return (
    <div className="mx-4 mb-3 rounded-xl border-2 border-[#0033A0]/20 bg-[#0033A0]/5 p-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <Brain className="size-4 text-[#0033A0]" />
        <span className="text-xs font-bold text-[#0033A0]">Quick review before you start?</span>
        <span className="ml-auto rounded-full bg-[#0033A0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0]">
          {review.conceptLabel}
        </span>
      </div>

      {/* Badges row */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${bloomColor}`}>
          {bloomLabel}
        </span>
        {review.daysOverdue > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
            <Clock className="size-2.5" />
            {review.daysOverdue}d overdue
          </span>
        )}
      </div>

      {/* Question */}
      <p className="mb-3 text-xs leading-relaxed text-gray-700">
        {review.question}
      </p>

      {/* Answer + actions */}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none"
          disabled={submitting}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !answer.trim()}
          className="flex items-center gap-1 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#002a85] disabled:opacity-50"
        >
          {submitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          Submit
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <SkipForward className="size-3" />
          Skip
        </button>
      </div>
    </div>
  )
}
