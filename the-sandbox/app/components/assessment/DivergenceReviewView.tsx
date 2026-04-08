'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, GitBranch, Loader2, Sparkles } from 'lucide-react'
import DivergenceTree from './DivergenceTree'
import type {
  DivergenceParticipantPath,
  DivergenceTreeNode,
} from '../../lib/assessment/types'

interface DivergenceReviewViewProps {
  roomId: string
  courseHeaders: Record<string, string>
  studentId?: string | null
}

interface DivergenceResponse {
  room: {
    id: string
    title: string
  }
  scenario: string
  tree: DivergenceTreeNode
  clusterCount: number
  keyDecisionPoints: Array<{ turn: number; divergenceScore: number }>
  participants: Array<{
    userId: string
    name: string
    coherenceScore: number
  }>
  selectedParticipant: DivergenceParticipantPath
}

export default function DivergenceReviewView({
  roomId,
  courseHeaders,
  studentId,
}: DivergenceReviewViewProps) {
  const [data, setData] = useState<DivergenceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(studentId ?? null)

  useEffect(() => {
    setSelectedUserId(studentId ?? null)
  }, [roomId, studentId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const query = selectedUserId
          ? `?userId=${encodeURIComponent(selectedUserId)}`
          : ''
        const res = await fetch(`/api/assessment/divergence/${roomId}${query}`, {
          headers: courseHeaders,
        })
        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload.error ?? 'Failed to load divergence assessment')
        }
        if (!cancelled) {
          setData(payload)
          setSelectedUserId(payload.selectedParticipant.userId)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load divergence assessment'
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
        {error ?? 'Divergence assessment is unavailable.'}
      </div>
    )
  }

  const highestDivergence = [...data.keyDecisionPoints].sort(
    (left, right) => right.divergenceScore - left.divergenceScore
  )[0]

  return (
    <section className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0]">
            Divergence Review
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{data.room.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Review branching decisions, coherence, and the decision framework that emerged.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-[#0033A0]">
            {data.clusterCount} ending cluster{data.clusterCount === 1 ? '' : 's'}
          </span>
          {highestDivergence && (
            <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
              Turn {highestDivergence.turn} diverged most
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          Scenario
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-purple-900">
          {data.scenario}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <GitBranch className="size-4 text-[#0033A0]" />
            Decision Tree
          </div>
          <DivergenceTree
            tree={data.tree}
            participants={data.participants}
            keyDecisionPoints={data.keyDecisionPoints}
            selectedUserId={data.selectedParticipant.userId}
            onSelectUser={setSelectedUserId}
          />
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {data.selectedParticipant.name}
                </p>
                <p className="text-xs text-gray-500">Selected participant</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0033A0]">
                {Math.round(data.selectedParticipant.coherenceScore * 100)}% coherence
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0]">
                AI Rationale
              </p>
              <p className="mt-1 text-sm text-blue-900">
                {data.selectedParticipant.coherenceRationale || 'No rationale recorded yet.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Decision Path
            </p>
            <div className="mt-3 space-y-3">
              {data.selectedParticipant.decisions.map((decision) => (
                <div key={`${decision.turn}-${decision.choice}`} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                      Turn {decision.turn}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{decision.choice}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{decision.narrative}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Sparkles className="size-4" />
              End State
            </div>
            <p className="mt-2 text-sm text-amber-900">{data.selectedParticipant.endState}</p>
          </div>

          {data.selectedParticipant.decisions.length === 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mr-2 inline size-4" />
              No decisions were captured for this participant.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
