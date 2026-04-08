'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react'
import { apiFetch } from '../../lib/api-client'
import type {
  MasteryGateAnswerPayload,
  MasteryGateAttemptDetail,
  MasteryGateCard,
  MasteryGateDetailPayload,
  MasteryGateQuestionRecord,
} from '../../lib/assessment/types'

interface MasteryGatePanelProps {
  userEmail: string
  gate: MasteryGateCard
  canAttempt: boolean
  onRefresh?: () => Promise<void> | void
}

function percent(value: number | null | undefined) {
  if (value == null) return '0%'
  return `${Math.round(value * 100)}%`
}

function formatDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusClasses(status: MasteryGateCard['status']) {
  switch (status) {
    case 'PASSED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'FAILED_RETRY':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'LOCKED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-violet-100 text-violet-800 border-violet-200'
  }
}

export default function MasteryGatePanel({
  userEmail,
  gate,
  canAttempt,
  onRefresh,
}: MasteryGatePanelProps) {
  const [detail, setDetail] = useState<MasteryGateDetailPayload | null>(null)
  const [activeAttempt, setActiveAttempt] = useState<MasteryGateAttemptDetail | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<MasteryGateQuestionRecord | null>(null)
  const [answer, setAnswer] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MasteryGateAnswerPayload | null>(null)

  useEffect(() => {
    if (gate.status !== 'IN_PROGRESS' && gate.attemptCount === 0) return
    void loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.id, gate.status, gate.attemptCount])

  async function loadDetail() {
    setLoadingDetail(true)
    setError(null)
    try {
      const payload = await apiFetch<MasteryGateDetailPayload>(
        userEmail,
        `/api/assessment/mastery-gate/${gate.id}`
      )
      setDetail(payload)
      setActiveAttempt(payload.activeAttempt)
      setCurrentQuestion(
        payload.activeAttempt?.questions.find((question) => question.isCorrect === undefined) ?? null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gate details')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleStart() {
    setStarting(true)
    setError(null)
    setResult(null)
    try {
      const payload = await apiFetch<{
        attempt: MasteryGateAttemptDetail
        currentQuestion: MasteryGateQuestionRecord
      }>(userEmail, `/api/assessment/mastery-gate/${gate.id}/start`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setActiveAttempt(payload.attempt)
      setCurrentQuestion(payload.currentQuestion)
      setAnswer('')
      await loadDetail()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start gate')
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmitAnswer() {
    if (!activeAttempt || !answer.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = await apiFetch<MasteryGateAnswerPayload>(
        userEmail,
        `/api/assessment/mastery-gate/${gate.id}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            attemptId: activeAttempt.id,
            answer: answer.trim(),
          }),
        }
      )
      setResult(payload)
      setActiveAttempt(payload.attempt)
      setCurrentQuestion(payload.currentQuestion)
      setAnswer('')
      await loadDetail()
      await onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const attemptHistory = detail?.attempts ?? (gate.latestAttempt ? [gate.latestAttempt] : [])

  return (
    <section className="rounded-3xl border-2 border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-slate-900">{gate.title}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(gate.status)}`}>
              {gate.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {gate.weekTitle ?? 'Course-level gate'}
            {gate.linkedAssignmentTitle ? ` · Linked to ${gate.linkedAssignmentTitle}` : ''}
          </p>
          {gate.description && (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{gate.description}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Readiness</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{percent(gate.readinessScore)}</p>
          <p className="mt-1 text-xs text-slate-500">Bloom floor L{gate.bloomFloor}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {gate.conceptsReadiness.map((concept) => (
          <div key={`${gate.id}-${concept.concept}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{concept.concept}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Bloom high {concept.bloomHighWater ? `L${concept.bloomHighWater}` : 'none yet'}
                </p>
              </div>
              {concept.dueNow && (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  Review due
                </span>
              )}
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full ${concept.dueNow ? 'bg-amber-500' : 'bg-[#0033A0]'}`}
                style={{ width: `${Math.max(6, ((concept.effectiveMastery ?? concept.mastery ?? 0) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{concept.note}</p>
          </div>
        ))}
      </div>

      {gate.availabilityReason && gate.status !== 'IN_PROGRESS' && gate.status !== 'PASSED' && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {gate.availabilityReason}
          {gate.nextAvailableAt && ` · Retry after ${formatDate(gate.nextAvailableAt)}`}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {canAttempt && (gate.available || gate.status === 'IN_PROGRESS') && (
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:opacity-60"
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : gate.status === 'IN_PROGRESS' ? <RotateCcw className="size-4" /> : <PlayCircle className="size-4" />}
            {gate.status === 'IN_PROGRESS' ? 'Resume Attempt' : 'Begin Assessment'}
          </button>
        )}

        {!canAttempt && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
            <Lock className="size-4" />
            Attempting disabled for this viewer
          </div>
        )}

        {gate.status === 'PASSED' && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" />
            Mastery demonstrated
          </div>
        )}

        {gate.unlockLabel && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-800">
            <Sparkles className="size-4" />
            {gate.unlockLabel}
          </div>
        )}
      </div>

      {(loadingDetail || activeAttempt) && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          {loadingDetail && !activeAttempt ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin text-[#0033A0]" />
              Loading gate detail
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Current attempt</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Attempt #{activeAttempt?.attemptNumber} · {activeAttempt?.correctCount ?? 0} correct so far
                  </p>
                </div>
                {activeAttempt && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {activeAttempt.questions.filter((question) => question.isCorrect !== undefined).length}/
                    {activeAttempt.totalQuestions} answered
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {activeAttempt?.questions.map((question, index) => (
                  <div key={`${activeAttempt.id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0]">
                      {question.concept} · Bloom L{question.bloomLevel}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{question.question}</p>
                    {question.studentAnswer && (
                      <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your answer</p>
                        <p className="text-sm text-slate-700">{question.studentAnswer}</p>
                        {question.feedback && (
                          <p className={`text-sm ${question.isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {question.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {currentQuestion && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Target className="size-4 text-[#0033A0]" />
                    Next response
                  </div>
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={5}
                    placeholder="Respond in your own words. Focus on reasoning, not just keywords."
                    className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSubmitAnswer()}
                      disabled={submitting || !answer.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                      Submit answer
                    </button>
                    <p className="text-xs text-slate-500">You’ll get immediate feedback after each response.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {result?.completed && (
        <div className={`mt-6 rounded-3xl border p-5 ${result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            {result.passed ? (
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
            ) : (
              <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
            )}
            <div>
              <p className={`text-base font-semibold ${result.passed ? 'text-emerald-900' : 'text-amber-900'}`}>
                {result.passed ? 'Gate passed' : 'Not quite there yet'}
              </p>
              <p className={`mt-1 text-sm ${result.passed ? 'text-emerald-800' : 'text-amber-800'}`}>
                {result.feedback}
              </p>
            </div>
          </div>

          {!result.passed && result.gapDiagnosis.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.gapDiagnosis.map((gap) => (
                <div key={`${gate.id}-${gap.concept}`} className="rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{gap.concept}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-amber-700">{gap.gapType.replace('_', ' ')}</p>
                  <p className="mt-2 text-sm text-slate-600">{gap.explanation}</p>
                  <p className="mt-2 text-sm text-slate-700">{gap.recommendation}</p>
                  <Link
                    href={gap.practiceHref}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0033A0] hover:underline"
                  >
                    Practice this
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {attemptHistory.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Attempt history</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {attemptHistory.map((attempt) => (
              <div key={attempt.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Attempt #{attempt.attemptNumber}</p>
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClasses(attempt.status)}`}>
                    {attempt.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {attempt.correctCount}/{Math.max(1, attempt.totalQuestions)} correct
                  {attempt.overallScore != null && ` · ${percent(attempt.overallScore)}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(attempt.completedAt) ?? formatDate(attempt.startedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
