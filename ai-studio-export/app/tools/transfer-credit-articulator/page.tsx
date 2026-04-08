'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import ConfidenceWarning from '../../components/registrar/ConfidenceWarning'

type Recommendation = 'APPROVE' | 'DENY' | 'NEEDS_REVIEW'
type Status = 'PENDING' | 'APPROVED' | 'DENIED'

type ArticulationRequest = {
  id: string
  studentEmail: string
  externalCourseTitle: string
  externalInstitution: string
  externalSyllabus: string
  internalCourseCode: string
  internalCourseTitle: string
  internalCourseDescription: string
  similarityScore: number
  reasoning: string
  recommendation: Recommendation
  status: Status
  reviewedBy: string | null
  createdAt: string
  updatedAt: string
}

type FormState = {
  externalCourseTitle: string
  externalInstitution: string
  internalCourseCode: string
  internalCourseTitle: string
  internalCourseDescription: string
  syllabus: string
}

const DEFAULT_FORM: FormState = {
  externalCourseTitle: '',
  externalInstitution: '',
  internalCourseCode: '',
  internalCourseTitle: '',
  internalCourseDescription: '',
  syllabus: '',
}

const recommendationStyles: Record<Recommendation, string> = {
  APPROVE: 'bg-emerald-100 text-emerald-700',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  DENY: 'bg-red-100 text-red-700',
}

const statusStyles: Record<Status, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  DENIED: 'bg-red-100 text-red-700',
}

function ScoreRing({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * 42
  const strokeDashoffset = circumference - (normalized / 100) * circumference
  const color =
    normalized >= 90 ? 'stroke-emerald-500' : normalized >= 70 ? 'stroke-amber-500' : 'stroke-red-500'

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="42"
          strokeWidth="8"
          className="fill-none stroke-slate-200"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`fill-none ${color}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-black text-slate-900">{Math.round(normalized)}</div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Match</div>
      </div>
    </div>
  )
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export default function TransferCreditArticulatorPage() {
  const { currentUser } = useAuth()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [requests, setRequests] = useState<ArticulationRequest[]>([])
  const [result, setResult] = useState<ArticulationRequest | null>(null)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [decisionLoading, setDecisionLoading] = useState<'APPROVED' | 'DENIED' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const headers = useMemo(
    () => ({
      'x-demo-user-email': currentUser.email,
    }),
    [currentUser.email]
  )

  const canReview = currentUser.role === 'ADMIN' || currentUser.role === 'EDUCATOR'

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const response = await fetch('/api/articulation', { headers })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load articulation requests.')
      }
      setRequests(data.requests ?? [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load articulation requests.')
    } finally {
      setLoadingRequests(false)
    }
  }, [headers])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('externalCourseTitle', form.externalCourseTitle)
      formData.set('externalInstitution', form.externalInstitution)
      formData.set('internalCourseCode', form.internalCourseCode)
      formData.set('internalCourseTitle', form.internalCourseTitle)
      formData.set('internalCourseDescription', form.internalCourseDescription)
      formData.set('syllabus', form.syllabus)

      const response = await fetch('/api/articulation/evaluate', {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Evaluation failed.')
      }

      setResult(data)
      setRequests((current) => [data, ...current.filter((entry) => entry.id !== data.id)])
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Evaluation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecision(decision: 'APPROVED' | 'DENIED') {
    if (!result) return
    setDecisionLoading(decision)
    setError(null)

    try {
      const response = await fetch(`/api/articulation/${result.id}/decision`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save decision.')
      }

      setResult(data)
      setRequests((current) => current.map((entry) => (entry.id === data.id ? data : entry)))
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Failed to save decision.')
    } finally {
      setDecisionLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-[#0033A0] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
              Registrar Tools
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-blue-100">
              Advisory AI + Human Review
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight">Transfer Credit Articulator</h1>
          <p className="mt-3 max-w-3xl text-base text-blue-100 sm:text-lg">
            Compare an incoming course against a UK equivalent, generate a confidence-scored recommendation,
            and keep the final decision with human reviewers.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Evaluate a transfer request</h2>
              <p className="mt-1 text-sm text-slate-500">
                Paste extracted syllabus text below. PDF extraction can be added later without changing this workflow.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">External course title</span>
                  <input
                    value={form.externalCourseTitle}
                    onChange={(event) => updateField('externalCourseTitle', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100"
                    placeholder="BIO 201 - Human Anatomy"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">External institution</span>
                  <input
                    value={form.externalInstitution}
                    onChange={(event) => updateField('externalInstitution', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100"
                    placeholder="Bluegrass Community and Technical College"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Internal course code</span>
                  <input
                    value={form.internalCourseCode}
                    onChange={(event) => updateField('internalCourseCode', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100"
                    placeholder="BIO 208"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Internal course title</span>
                  <input
                    value={form.internalCourseTitle}
                    onChange={(event) => updateField('internalCourseTitle', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100"
                    placeholder="Human Anatomy"
                    required
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Internal course description</span>
                <textarea
                  value={form.internalCourseDescription}
                  onChange={(event) => updateField('internalCourseDescription', event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100"
                  placeholder="Describe the official UK course outcomes, topics, and depth of coverage."
                  required
                />
              </label>

              <label className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700">External syllabus text</span>
                  <span className="text-xs font-medium text-slate-400">Paste text only for now</span>
                </div>
                <textarea
                  value={form.syllabus}
                  onChange={(event) => updateField('syllabus', event.target.value)}
                  className="min-h-64 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-blue-100"
                  placeholder="Paste the extracted syllabus text here. Include course objectives, weekly topics, assignments, and assessments if available."
                  required
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0033A0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#002980] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Evaluating transfer credit...' : 'Evaluate Transfer Credit'}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-[#0033A0]">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Evaluation Result</h2>
                <p className="text-sm text-slate-500">Advisory only. Final decisions require human review.</p>
              </div>
            </div>

            {result ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  AI scores are advisory. All decisions require human review and are subject to department chair confirmation.
                </div>

                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-slate-50 px-4 py-6 text-center">
                  <ScoreRing score={result.similarityScore} />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${recommendationStyles[result.recommendation]}`}>
                      {result.recommendation.replace('_', ' ')}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[result.status]}`}>
                      {result.status}
                    </span>
                  </div>
                </div>

                <ConfidenceWarning score={result.similarityScore} />

                <div className="rounded-2xl border border-slate-200 px-4 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Reasoning</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{result.reasoning}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {result.externalCourseTitle}
                        {' -> '}
                        {result.internalCourseCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted {formatTimestamp(result.createdAt)}
                        {result.reviewedBy ? ` | Reviewed by ${result.reviewedBy}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {canReview ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleDecision('APPROVED')}
                      disabled={decisionLoading !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {decisionLoading === 'APPROVED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('DENIED')}
                      disabled={decisionLoading !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {decisionLoading === 'DENIED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Deny
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                <Clock3 className="h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-bold text-slate-900">No evaluation yet</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Submit an external syllabus and internal course match to generate an advisory score and review-ready rationale.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent evaluations</h2>
              <p className="mt-1 text-sm text-slate-500">
                {canReview
                  ? 'Showing transfer credit requests for your institution scope.'
                  : 'Showing your submitted transfer credit evaluations.'}
              </p>
            </div>
          </div>

          {loadingRequests ? (
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading evaluations...
            </div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No articulation requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">External course</th>
                    <th className="px-6 py-3">Internal match</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Recommendation</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-slate-600">{formatTimestamp(request.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{request.externalCourseTitle}</div>
                        <div className="text-xs text-slate-500">{request.externalInstitution}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{request.internalCourseCode}</div>
                        <div className="text-xs text-slate-500">{request.internalCourseTitle}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{Math.round(request.similarityScore)}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${recommendationStyles[request.recommendation]}`}>
                          {request.recommendation.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[request.status]}`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
