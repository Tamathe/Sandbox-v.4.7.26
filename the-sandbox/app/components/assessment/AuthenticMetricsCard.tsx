'use client'

import { useEffect, useState } from 'react'
import { Calendar, Loader2, MessageSquare, Sparkles, TrendingUp, Users, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import type { AuthenticAssessmentSubmissionPayload } from '../../lib/assessment/types'

interface AuthenticMetricsCardProps {
  submission: AuthenticAssessmentSubmissionPayload
  courseHeaders?: Record<string, string>
  onEvidenceSaved?: (payload: { facultyScore: number | null; facultyNotes: string | null }) => void
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`
}

function MetricRing({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${Math.max(0, Math.min(360, value * 360))}deg, #e5e7eb 0deg)`,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-900">
          {percentLabel(value)}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  )
}

export default function AuthenticMetricsCard({
  submission,
  courseHeaders,
  onEvidenceSaved,
}: AuthenticMetricsCardProps) {
  const [facultyScore, setFacultyScore] = useState(
    submission.evidenceFacultyScore != null ? String(submission.evidenceFacultyScore) : ''
  )
  const [facultyNotes, setFacultyNotes] = useState(submission.evidenceFacultyNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFacultyScore(
      submission.evidenceFacultyScore != null ? String(submission.evidenceFacultyScore) : ''
    )
    setFacultyNotes(submission.evidenceFacultyNotes ?? '')
  }, [submission.evidenceFacultyNotes, submission.evidenceFacultyScore])

  async function saveOverride() {
    if (!courseHeaders || !submission.evidenceId) return

    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/assessment/evidence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...courseHeaders,
        },
        body: JSON.stringify({
          id: submission.evidenceId,
          facultyScore: facultyScore.trim() === '' ? null : Number(facultyScore),
          facultyNotes,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save authentic assessment review')
      }

      onEvidenceSaved?.({
        facultyScore: payload.evidence.facultyScore ?? null,
        facultyNotes: payload.evidence.facultyNotes ?? null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save authentic assessment review')
    } finally {
      setSaving(false)
    }
  }

  const { metrics } = submission

  return (
    <section className="rounded-2xl border-2 border-gray-200 bg-white p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#0033A0]" />
            <h3 className="text-sm font-semibold text-gray-800">Authentic Audience Metrics</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {metrics.toolName} linked to this submission. Composite score reflects real usage,
            impact, and iteration signals.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0033A0]">
            Composite
          </p>
          <p className="mt-1 text-3xl font-bold text-[#0033A0]">
            {percentLabel(metrics.scores.composite)}
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {submission.aiScore != null ? `${submission.aiScore.toFixed(1)} draft points` : 'Awaiting draft score'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricRing label="Functionality" value={metrics.scores.functionality} color="#0033A0" />
        <MetricRing label="Usage" value={metrics.scores.usage} color="#0f766e" />
        <MetricRing label="Impact" value={metrics.scores.impact} color="#ca8a04" />
        <MetricRing label="Iteration" value={metrics.scores.iteration} color="#be185d" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Users className="size-3.5" />
            Usage
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {metrics.totalSessions} sessions from {metrics.uniqueUsers} unique users
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {metrics.repeatUsers} users came back, average session {metrics.avgSessionDuration}s
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <TrendingUp className="size-3.5" />
            Impact
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {metrics.totalRatings > 0
              ? `${metrics.positiveRatings}/${metrics.totalRatings} positive signals`
              : 'No outside quality signals yet'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {metrics.avgQualitySignal != null
              ? `Average quality signal ${percentLabel(metrics.avgQualitySignal)}`
              : 'Impact score will rise once outside users leave session-quality traces.'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Calendar className="size-3.5" />
            Timeline
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Created {format(new Date(metrics.createdAt), 'MMM d, yyyy')}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Updated {metrics.lastEditedAt ? format(new Date(metrics.lastEditedAt), 'MMM d, yyyy') : 'not yet'}
            {metrics.published ? ' and currently published' : ' and still unpublished'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
          <Wrench className="size-3.5" />
          Iteration Note
        </p>
        <p className="mt-2 text-sm text-amber-900">{metrics.iterationHeuristic}</p>
        <p className="mt-2 text-sm text-amber-900">
          {metrics.editCount} creator edit signal, {metrics.commentCount} outside feedback comments,
          and a {percentLabel(metrics.feedbackResponseRate)} inferred response rate.
        </p>
      </div>

      {courseHeaders && submission.evidenceId ? (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-800">
            <MessageSquare className="size-3.5" />
            Faculty Override
          </p>
          <div className="grid gap-3 md:grid-cols-[140px,1fr]">
            <label className="text-xs text-purple-800">
              <span className="mb-1 block font-semibold uppercase tracking-wide">
                Evidence score
              </span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={facultyScore}
                onChange={(event) => setFacultyScore(event.target.value)}
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </label>
            <label className="text-xs text-purple-800">
              <span className="mb-1 block font-semibold uppercase tracking-wide">Notes</span>
              <textarea
                value={facultyNotes}
                onChange={(event) => setFacultyNotes(event.target.value)}
                rows={3}
                placeholder="Capture why you agree with or override the authentic audience signal."
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveOverride}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Save Authentic Review
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
