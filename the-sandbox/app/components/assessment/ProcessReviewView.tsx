'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react'
import type {
  AssessmentEvidenceRecord,
  AssessmentEvidenceSummary,
  ProcessAnnotation,
  ProcessTranscriptMessage,
} from '../../lib/assessment/types'

interface ProcessReviewViewProps {
  sessionId: string
  courseHeaders: Record<string, string>
  onEvidenceUpdated?: (payload: {
    evidence: AssessmentEvidenceRecord
    summary: AssessmentEvidenceSummary
  }) => void
}

interface ProcessReviewPayload {
  sessionId: string
  messages: ProcessTranscriptMessage[]
  annotations: ProcessAnnotation[]
  reflection: string | null
  sessionMeta: {
    mode: string
    duration: number
    messageCount: number
    startedAt: string
    endedAt: string | null
  }
  evidence: AssessmentEvidenceRecord | null
  permissions: {
    canScore: boolean
  }
}

function percentLabel(value: number | null) {
  if (value == null) return 'Pending'
  return `${Math.round(value * 100)}%`
}

function formatMinutes(durationSeconds: number) {
  if (!durationSeconds) return '0 min'
  return `${Math.max(1, Math.round(durationSeconds / 60))} min`
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <span>{label}</span>
        <span className="text-gray-700">{percentLabel(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-[#0033A0] transition-all"
          style={{ width: `${Math.max(0, Math.min(100, (value ?? 0) * 100))}%` }}
        />
      </div>
    </div>
  )
}

export default function ProcessReviewView({
  sessionId,
  courseHeaders,
  onEvidenceUpdated,
}: ProcessReviewViewProps) {
  const [data, setData] = useState<ProcessReviewPayload | null>(null)
  const [facultyScore, setFacultyScore] = useState<string>('')
  const [facultyNotes, setFacultyNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/assessment/process/${sessionId}`, {
        headers: courseHeaders,
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to load process review')
      }

      const nextData = payload as ProcessReviewPayload
      setData(nextData)
      setFacultyScore(
        nextData.evidence?.facultyScore != null ? String(nextData.evidence.facultyScore) : ''
      )
      setFacultyNotes(nextData.evidence?.facultyNotes ?? '')
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Failed to load process review')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const annotationMap = useMemo(
    () => new Map((data?.annotations ?? []).map((annotation) => [annotation.messageIndex, annotation.text])),
    [data?.annotations]
  )

  const reviewRecommended = useMemo(() => {
    if (!data?.evidence) return false
    const values = [
      data.evidence.aiProcessScore,
      data.evidence.aiCoherenceScore,
      data.evidence.aiDepthScore,
    ].filter((value): value is number => value != null)

    if (values.length < 2) return false

    return Math.max(...values) - Math.min(...values) > 0.3
  }, [data?.evidence])

  async function handleRunScoring() {
    if (!data?.permissions.canScore) return

    setScoring(true)
    setError(null)

    try {
      const res = await fetch(`/api/assessment/process/${sessionId}/score`, {
        method: 'POST',
        headers: courseHeaders,
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to score process assessment')
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              evidence: payload.evidence,
            }
          : prev
      )
      setFacultyScore(payload.evidence.facultyScore != null ? String(payload.evidence.facultyScore) : '')
      setFacultyNotes(payload.evidence.facultyNotes ?? '')
      onEvidenceUpdated?.({
        evidence: payload.evidence,
        summary: payload.summary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to score process assessment')
    } finally {
      setScoring(false)
    }
  }

  async function saveFacultyReview(nextFacultyScore: number | null) {
    if (!data?.evidence) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/assessment/evidence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...courseHeaders,
        },
        body: JSON.stringify({
          id: data.evidence.id,
          facultyScore: nextFacultyScore,
          facultyNotes,
        }),
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to save faculty review')
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              evidence: payload.evidence,
            }
          : prev
      )
      setFacultyScore(
        payload.evidence.facultyScore != null ? String(payload.evidence.facultyScore) : ''
      )
      setFacultyNotes(payload.evidence.facultyNotes ?? '')
      onEvidenceUpdated?.({
        evidence: payload.evidence,
        summary: payload.summary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save faculty review')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-10">
        <Loader2 className="size-5 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error ?? 'Unable to load the process review view.'}
      </div>
    )
  }

  return (
    <section className="rounded-2xl border-2 border-gray-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">Process Review</h3>
            {reviewRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                <AlertTriangle className="size-3.5" />
                Review recommended
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {data.sessionMeta.mode} transcript with inline student annotations and AI process pre-scores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {data.sessionMeta.messageCount} messages
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {formatMinutes(data.sessionMeta.duration)}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-1">
            {data.messages.map((message, index) => {
              const annotation = annotationMap.get(index)
              const isStudent = message.role === 'user'

              return (
                <article key={`${message.timestamp}-${index}`} className="space-y-2">
                  <div className={`flex gap-3 ${isStudent ? '' : 'flex-row-reverse'}`}>
                    <div
                      className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ${
                        isStudent
                          ? 'bg-[#0033A0] text-white'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {isStudent ? <User className="size-4" /> : <Bot className="size-4" />}
                    </div>
                    <div className="w-full max-w-[90%]">
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                          isStudent
                            ? 'border-blue-100 bg-blue-50 text-blue-950'
                            : 'border-purple-100 bg-purple-50 text-purple-950'
                        }`}
                      >
                        {message.content}
                      </div>
                      {annotation && (
                        <div className="mt-2 rounded-r-2xl rounded-l-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                          {annotation}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Student Reflection
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-950 whitespace-pre-wrap">
              {data.reflection?.trim() || 'No summary reflection submitted.'}
            </p>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                AI Pre-Scores
              </p>
              <button
                type="button"
                onClick={() => void handleRunScoring()}
                disabled={!data.permissions.canScore || scoring}
                className="flex items-center gap-1.5 rounded-lg border border-[#0033A0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0033A0] hover:bg-[#0033A0]/5 disabled:opacity-50"
              >
                {scoring ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {data.evidence?.aiProcessScore != null ? 'Re-run scoring' : 'Run scoring'}
              </button>
            </div>

            <ScoreBar label="Revision Depth" value={data.evidence?.aiProcessScore ?? null} />
            <ScoreBar label="Coherence" value={data.evidence?.aiCoherenceScore ?? null} />
            <ScoreBar label="Metacognition" value={data.evidence?.aiDepthScore ?? null} />
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              AI Rationale
            </p>
            <p className="mt-2 text-sm leading-relaxed text-purple-950">
              {data.evidence?.aiScoringRationale ?? 'Process scoring has not been run yet.'}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Faculty Override
            </p>
            <label className="block text-sm text-gray-600">
              <span className="mb-1 block font-medium text-gray-700">Override score (0-1)</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={facultyScore}
                onChange={(event) => setFacultyScore(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
              />
            </label>

            <label className="block text-sm text-gray-600">
              <span className="mb-1 block font-medium text-gray-700">Faculty notes</span>
              <textarea
                value={facultyNotes}
                onChange={(event) => setFacultyNotes(event.target.value)}
                rows={4}
                placeholder="Capture any override rationale or follow-up questions."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
              />
            </label>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  void saveFacultyReview(
                    facultyScore.trim() === '' ? null : Number(facultyScore)
                  )
                }
                disabled={saving || !data.evidence}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002680] disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save Faculty Review
              </button>
              <button
                type="button"
                onClick={() =>
                  void saveFacultyReview(data.evidence?.aiProcessScore ?? null)
                }
                disabled={
                  saving ||
                  !data.evidence ||
                  data.evidence.aiProcessScore == null
                }
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                Approve AI Score
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
