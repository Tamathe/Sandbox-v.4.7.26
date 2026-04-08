'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, MessageSquareQuote, Scale, Sparkles } from 'lucide-react'

interface CrossExamScorecardProps {
  roomId: string
  courseHeaders: Record<string, string>
  userId?: string | null
}

interface CrossExamResponse {
  room: {
    id: string
    title: string
    type: string
  }
  participants: Array<{
    userId: string
    name: string
    overall: number
    peerAverage: number
  }>
  participant: {
    userId: string
    name: string
    ai: {
      argumentQuality: number
      evidenceUse: number
      rebuttals: number
      overall: number
      rationale?: string
    }
    peer: {
      ratings: number[]
      average: number
    }
    excerpts?: {
      strongest?: string
      weakest?: string
    }
  }
  ai: {
    argumentQuality: number
    evidenceUse: number
    rebuttals: number
    overall: number
    rationale?: string
  }
  peer: {
    ratings: number[]
    average: number
  }
  self: {
    score: number
    reflection: string
  }
  excerpts: {
    strongest?: string
    weakest?: string
  }
  composite: number
  weights: {
    ai: number
    peer: number
    self: number
  }
  permissions: {
    canSelfAssess: boolean
  }
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{percentLabel(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-[#0033A0]"
          style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
        />
      </div>
    </div>
  )
}

export default function CrossExamScorecard({
  roomId,
  courseHeaders,
  userId,
}: CrossExamScorecardProps) {
  const [data, setData] = useState<CrossExamResponse | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userId ?? null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selfScore, setSelfScore] = useState('')
  const [reflection, setReflection] = useState('')

  useEffect(() => {
    setSelectedUserId(userId ?? null)
  }, [roomId, userId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const query = selectedUserId
          ? `?userId=${encodeURIComponent(selectedUserId)}`
          : ''
        const res = await fetch(`/api/assessment/cross-exam/${roomId}${query}`, {
          headers: courseHeaders,
        })
        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload.error ?? 'Failed to load cross-exam scorecard')
        }
        if (!cancelled) {
          setData(payload)
          setSelectedUserId(payload.participant.userId)
          setSelfScore(
            payload.self.score > 0 ? String(Math.round(payload.self.score * 100)) : ''
          )
          setReflection(payload.self.reflection ?? '')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load cross-exam scorecard'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [courseHeaders, roomId, selectedUserId])

  async function handleSaveSelfAssessment() {
    if (!data?.permissions.canSelfAssess) return

    setSaving(true)
    setError(null)
    try {
      const normalizedScore =
        selfScore.trim().length > 0 ? Math.max(0, Math.min(100, Number(selfScore))) / 100 : undefined
      const res = await fetch(`/api/assessment/cross-exam/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...courseHeaders,
        },
        body: JSON.stringify({
          ...(normalizedScore != null && Number.isFinite(normalizedScore)
            ? { selfScore: normalizedScore }
            : {}),
          reflection,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to save self-assessment')
      }
      setData((previous) =>
        previous
          ? {
              ...previous,
              self: payload.self,
              composite: payload.composite,
            }
          : previous
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save self-assessment'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white p-8">
        <Loader2 className="size-5 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? 'Cross-exam scorecard is unavailable.'}
      </div>
    )
  }

  return (
    <section className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0]">
            Cross-Exam Scorecard
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{data.room.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            AI, peer, and self-assessment signals combined into one argumentation score.
          </p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0033A0]">
          Composite {percentLabel(data.composite)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.participants.map((participant) => {
          const isSelected = participant.userId === data.participant.userId
          return (
            <button
              key={participant.userId}
              type="button"
              onClick={() => setSelectedUserId(participant.userId)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isSelected
                  ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]/30 hover:text-[#0033A0]'
              }`}
            >
              {participant.name}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Sparkles className="size-4 text-[#0033A0]" />
            AI Assessment
          </div>
          <ScoreBar label="Argument quality" value={data.ai.argumentQuality} />
          <ScoreBar label="Evidence use" value={data.ai.evidenceUse} />
          <ScoreBar label="Rebuttals" value={data.ai.rebuttals} />
          <ScoreBar label="Overall" value={data.ai.overall} />
          {data.ai.rationale && (
            <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-sm text-purple-900">
              {data.ai.rationale}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Scale className="size-4 text-[#0033A0]" />
            Peer Assessment
          </div>
          <ScoreBar label="Peer average" value={data.peer.average} />
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Ratings captured
            </p>
            <p className="mt-2 text-sm text-gray-700">
              {data.peer.ratings.length > 0
                ? data.peer.ratings.map((rating) => percentLabel(rating)).join(', ')
                : 'No peer ratings captured'}
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Weights: AI {Math.round(data.weights.ai * 100)}%, Peer {Math.round(data.weights.peer * 100)}%, Self {Math.round(data.weights.self * 100)}%
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MessageSquareQuote className="size-4 text-[#0033A0]" />
            Self Assessment
          </div>

          {data.permissions.canSelfAssess ? (
            <>
              <label className="text-xs text-gray-500">
                <span className="mb-1 block font-semibold uppercase tracking-wide">
                  Self score (0-100)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={selfScore}
                  onChange={(event) => setSelfScore(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                />
              </label>
              <label className="text-xs text-gray-500">
                <span className="mb-1 block font-semibold uppercase tracking-wide">
                  Reflection
                </span>
                <textarea
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
                  placeholder="What held up under pressure, and what would you revise next time?"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleSaveSelfAssessment()}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#002680] disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Self-Assessment
              </button>
            </>
          ) : (
            <>
              <ScoreBar label="Self score" value={data.self.score} />
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                {data.self.reflection || 'No self-reflection submitted yet.'}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Strongest Excerpt
          </p>
          <p className="mt-2 text-sm text-emerald-900">
            {data.excerpts.strongest || 'No excerpt captured.'}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Weakest Excerpt
          </p>
          <p className="mt-2 text-sm text-amber-900">
            {data.excerpts.weakest || 'No excerpt captured.'}
          </p>
        </div>
      </div>

      {!data.excerpts.strongest && !data.excerpts.weakest && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mr-2 inline size-4" />
          This room did not capture rich excerpts, so the scorecard leans more heavily on the aggregate scores.
        </div>
      )}
    </section>
  )
}
