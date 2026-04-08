'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../lib/auth-context'
import {
  Brain,
  CheckCircle2,
  XCircle,
  SkipForward,
  Send,
  X,
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function MicroReviewModal({
  courseId,
  onDismiss,
}: {
  courseId: string
  onDismiss: () => void
}) {
  const { currentUser } = useAuth()
  const [review, setReview] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [startTime] = useState(Date.now())
  const [flipped, setFlipped] = useState(false)
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Check localStorage throttle + fetch review
  useEffect(() => {
    const throttleKey = getThrottleKey(courseId)
    if (typeof window !== 'undefined' && localStorage.getItem(throttleKey)) {
      onDismiss()
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
          onDismiss()
        }
      })
      .catch(() => onDismiss())
      .finally(() => setLoading(false))
  }, [courseId, currentUser.email, onDismiss])

  // Focus textarea on mount
  useEffect(() => {
    if (review && !result) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [review, result])

  // Escape key handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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
      // Flash + flip animation
      setFlashColor(data.correct ? 'green' : 'red')
      setTimeout(() => setFlashColor(null), 200)
      setTimeout(() => setFlipped(true), 50)
    } catch {
      onDismiss()
    } finally {
      setSubmitting(false)
    }
  }, [review, answer, submitting, currentUser.email, startTime, onDismiss, setThrottle])

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
      onDismiss()
    } catch {
      onDismiss()
    }
  }, [review, submitting, currentUser.email, onDismiss, setThrottle])

  const handleDismiss = useCallback(() => {
    setThrottle()
    onDismiss()
  }, [onDismiss, setThrottle])

  // Loading or no review — don't show modal
  if (loading || !review) return null

  const bloomLabel = BLOOM_LABELS[review.bloomLevel] ?? 'Understand'
  const bloomColor = BLOOM_COLORS[review.bloomLevel] ?? BLOOM_COLORS[2]

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="micro-review-title"
    >
      {/* Backdrop close */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={handleDismiss}
        aria-label="Close review"
      />

      {/* Flash overlay */}
      {flashColor && (
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
            flashColor === 'green' ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}
        />
      )}

      {/* Card with flip animation */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md"
        style={{ perspective: '1200px' }}
      >
        <div
          className="relative transition-transform duration-600 ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transitionDuration: '600ms',
          }}
        >
          {/* ─── Front Face (Question) ──────────────────────────── */}
          <div
            className="rounded-2xl border-2 border-gray-200 bg-white shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <div className="p-6">
              {/* Header */}
              <div className="mb-4 flex items-center gap-2">
                <Brain className="size-5 text-[#0033A0]" />
                <span id="micro-review-title" className="text-sm font-bold text-gray-900">Quick Review</span>
              </div>

              {/* Concept pill with course name + Bloom badge */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-semibold text-[#0033A0]">
                  {review.conceptLabel} &middot; {review.courseName}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${bloomColor}`}>
                  {bloomLabel} ({review.bloomLevel})
                </span>
              </div>

              {/* Days overdue indicator */}
              {review.daysOverdue > 0 && (
                <p className="mb-4 flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="size-3" />
                  Last reviewed {review.daysOverdue} day{review.daysOverdue !== 1 ? 's' : ''} ago
                </p>
              )}

              {/* Question */}
              <p className="mb-5 text-sm leading-relaxed text-gray-800">
                {review.question}
              </p>

              {/* Answer input */}
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                rows={3}
                className="mb-4 w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none"
                disabled={submitting}
                onKeyDown={(e) => {
                  // Enter without Shift should NOT submit — only button click submits
                }}
              />

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !answer.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002a85] disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <SkipForward className="size-4" />
                  Skip
                </button>
              </div>

              {/* Not Now text link */}
              <button
                type="button"
                onClick={handleDismiss}
                className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          {/* ─── Back Face (Result) ─────────────────────────────── */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-gray-200 bg-white shadow-2xl"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            {result && (
              <div className="p-6">
                {/* Correct / Incorrect badge */}
                <div className="mb-4 flex items-center gap-3">
                  {result.correct ? (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="size-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-700">Correct!</p>
                        <p className="text-xs text-gray-500">
                          Great recall on {review.conceptLabel}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="size-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-700">Not quite</p>
                        <p className="text-xs text-gray-500">
                          Keep reviewing {review.conceptLabel}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Haiku feedback */}
                {result.feedback && (
                  <div className="mb-4 rounded-xl border-2 border-blue-100 bg-blue-50 p-3">
                    <p className="text-sm text-blue-800">{result.feedback}</p>
                  </div>
                )}

                {/* Correct answer (if wrong) */}
                {result.correctAnswer && (
                  <div className="mb-4 rounded-xl border-2 border-gray-100 bg-gray-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-gray-500">Expected answer</p>
                    <p className="text-sm text-gray-800">{result.correctAnswer}</p>
                  </div>
                )}

                {/* Remediation hint */}
                {result.hint && (
                  <div className="mb-4 flex gap-2 rounded-xl border-2 border-amber-100 bg-amber-50 p-3">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="mb-0.5 text-xs font-semibold text-amber-700">Study tip</p>
                      <p className="text-sm text-amber-800">{result.hint}</p>
                    </div>
                  </div>
                )}

                {/* Next review date */}
                {result.nextReviewIn && (
                  <p className="mb-4 text-center text-xs text-gray-500">
                    Next review: <span className="font-semibold">{result.nextReviewIn}</span>
                  </p>
                )}

                {/* Dismiss */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
