'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  ClipboardList,
  type LucideIcon,
  Loader2,
  MessageSquare,
  PenSquare,
  Scale,
  Sparkles,
} from 'lucide-react'
import {
  parseCrossExamSelfAssessment,
  parseProcessAnnotationPayload,
  summarizeAssessmentEvidence,
  type AssessmentEvidenceRecord,
  type EvidenceType,
} from '../../lib/assessment/types'

interface AssessmentEvidencePanelProps {
  entryId: string
  evidence: AssessmentEvidenceRecord[]
  processScore: number | null
  compositeMethod: string | null
  courseHeaders: Record<string, string>
  transcriptSource?: {
    sourceId: string
    sourceLabel: string
  } | null
  onEvidenceChange?: (payload: {
    evidence: AssessmentEvidenceRecord[]
    processScore: number | null
    compositeMethod: string | null
  }) => void
}

const EVIDENCE_META: Record<EvidenceType, { label: string; icon: LucideIcon; tint: string }> = {
  SANDY_TRANSCRIPT: { label: 'Sandy Transcript', icon: MessageSquare, tint: 'text-purple-600 bg-purple-50 border-purple-100' },
  SIMULATION_THREAD: { label: 'Simulation Thread', icon: Sparkles, tint: 'text-blue-700 bg-blue-50 border-blue-100' },
  TEACHBACK_SESSION: { label: 'Teach-Back Session', icon: ClipboardList, tint: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  PEER_REVIEW_SESSION: { label: 'Peer Review', icon: ClipboardList, tint: 'text-amber-700 bg-amber-50 border-amber-100' },
  DEBATE_SESSION: { label: 'Debate Session', icon: Scale, tint: 'text-rose-700 bg-rose-50 border-rose-100' },
  FISHBOWL_SESSION: { label: 'Fishbowl Session', icon: Scale, tint: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
  TOOL_USAGE: { label: 'Tool Usage', icon: Sparkles, tint: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  FLASHCARD_MASTERY: { label: 'Flashcard Mastery', icon: Bot, tint: 'text-sky-700 bg-sky-50 border-sky-100' },
  CONCEPT_MASTERY: { label: 'Concept Mastery', icon: Bot, tint: 'text-teal-700 bg-teal-50 border-teal-100' },
  STUDENT_ANNOTATION: { label: 'Student Annotation', icon: PenSquare, tint: 'text-orange-700 bg-orange-50 border-orange-100' },
}

function percentLabel(value: number | null) {
  if (value == null) return 'Pending'
  return `${Math.round(value * 100)}%`
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{percentLabel(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${value == null ? 'bg-gray-200 w-0' : 'bg-[#0033A0]'}`}
          style={{ width: `${Math.max(0, Math.min(100, (value ?? 0) * 100))}%` }}
        />
      </div>
    </div>
  )
}

export default function AssessmentEvidencePanel({
  entryId,
  evidence,
  processScore,
  compositeMethod,
  courseHeaders,
  transcriptSource,
  onEvidenceChange,
}: AssessmentEvidencePanelProps) {
  const [localEvidence, setLocalEvidence] = useState(evidence)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalEvidence(evidence)
  }, [evidence])

  const summary = useMemo(
    () =>
      summarizeAssessmentEvidence(localEvidence, {
        processScore,
        compositeMethod,
      }),
    [compositeMethod, localEvidence, processScore]
  )

  const hasLinkedTranscript = Boolean(
    transcriptSource &&
      localEvidence.some(
        (item) =>
          item.evidenceType === 'SANDY_TRANSCRIPT' &&
          item.sourceId === transcriptSource.sourceId
      )
  )

  function updateLocalEvidence(id: string, patch: Partial<AssessmentEvidenceRecord>) {
    setLocalEvidence((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function saveEvidence(item: AssessmentEvidenceRecord) {
    setSavingId(item.id)
    setError(null)
    try {
      const res = await fetch('/api/assessment/evidence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          id: item.id,
          facultyScore: item.facultyScore,
          facultyNotes: item.facultyNotes,
          weight: item.weight,
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to save evidence review')
      }

      const nextEvidence = localEvidence.map((existing) =>
        existing.id === item.id ? payload.evidence : existing
      )
      setLocalEvidence(nextEvidence)
      onEvidenceChange?.({
        evidence: nextEvidence,
        processScore: payload.summary.processScore,
        compositeMethod: payload.summary.compositeMethod,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save evidence review')
    } finally {
      setSavingId(null)
    }
  }

  async function linkTranscript() {
    if (!transcriptSource) return
    setLinking(true)
    setError(null)
    try {
      const res = await fetch('/api/assessment/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          gradebookEntryId: entryId,
          evidenceType: 'SANDY_TRANSCRIPT',
          sourceId: transcriptSource.sourceId,
          sourceLabel: transcriptSource.sourceLabel,
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to link transcript evidence')
      }

      const nextEvidence = localEvidence.some((item) => item.id === payload.evidence.id)
        ? localEvidence.map((item) => (item.id === payload.evidence.id ? payload.evidence : item))
        : [payload.evidence, ...localEvidence]
      setLocalEvidence(nextEvidence)
      onEvidenceChange?.({
        evidence: nextEvidence,
        processScore: payload.summary.processScore,
        compositeMethod: payload.summary.compositeMethod,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link transcript evidence')
    } finally {
      setLinking(false)
    }
  }

  return (
    <section className="rounded-2xl border-2 border-gray-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Assessment Evidence</h3>
          <p className="mt-1 text-xs text-gray-500">
            Linked process evidence for this submission, including transcript-based review.
          </p>
        </div>
        {transcriptSource && !hasLinkedTranscript && (
          <button
            type="button"
            onClick={linkTranscript}
            disabled={linking}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            {linking ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquare className="size-3.5" />}
            Link Transcript
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0033A0]">Composite</p>
          <p className="mt-1 text-2xl font-bold text-[#0033A0]">{percentLabel(summary.processScore)}</p>
          <p className="mt-1 text-xs text-blue-700">
            {summary.compositeMethod ? summary.compositeMethod.replace('_', ' ') : 'No evidence yet'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Process</p>
          <p className="mt-1 text-lg font-semibold text-gray-800">{percentLabel(summary.weightedScores.process)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Coherence</p>
          <p className="mt-1 text-lg font-semibold text-gray-800">{percentLabel(summary.weightedScores.coherence)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Depth</p>
          <p className="mt-1 text-lg font-semibold text-gray-800">{percentLabel(summary.weightedScores.depth)}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {localEvidence.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
          <ClipboardList className="mx-auto mb-2 size-5 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No evidence linked yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Add transcript or activity evidence to make process review visible alongside the rubric.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {localEvidence.map((item) => {
            const meta = EVIDENCE_META[item.evidenceType]
            const Icon = meta.icon
            const parsedAnnotation = parseProcessAnnotationPayload(item.studentAnnotation)
            const hasStructuredAnnotation =
              parsedAnnotation.annotations.length > 0 || Boolean(parsedAnnotation.reflection)
            const parsedCrossExamAnnotation = parseCrossExamSelfAssessment(
              item.studentAnnotation
            )
            const isCrossExamEvidence =
              item.evidenceType === 'DEBATE_SESSION' ||
              item.evidenceType === 'FISHBOWL_SESSION'
            const hasCrossExamAnnotation =
              parsedCrossExamAnnotation.selfScore != null ||
              Boolean(parsedCrossExamAnnotation.reflection)

            return (
              <article key={item.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl border ${meta.tint}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {item.sourceLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Weight {item.weight.toFixed(2)}
                        {item.reviewedAt ? ` - Reviewed ${new Date(item.reviewedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid w-full max-w-[220px] grid-cols-2 gap-2">
                    <label className="text-xs text-gray-500">
                      <span className="mb-1 block">Weight</span>
                      <input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={item.weight}
                        onChange={(event) =>
                          updateLocalEvidence(item.id, {
                            weight: Number(event.target.value) || 1,
                          })
                        }
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                      />
                    </label>
                    <label className="text-xs text-gray-500">
                      <span className="mb-1 block">Faculty score (0-1)</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={item.facultyScore ?? ''}
                        onChange={(event) =>
                          updateLocalEvidence(item.id, {
                            facultyScore:
                              event.target.value === '' ? null : Number(event.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <ScoreBar label="Process" value={item.aiProcessScore} />
                  <ScoreBar label="Coherence" value={item.aiCoherenceScore} />
                  <ScoreBar label="Depth" value={item.aiDepthScore} />
                </div>

                {item.aiScoringRationale && (
                  <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2">
                    <p className="text-xs font-semibold text-purple-700">AI Rationale</p>
                    <p className="mt-1 text-sm text-purple-900">{item.aiScoringRationale}</p>
                  </div>
                )}

                {item.studentAnnotation && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-800">Student Annotation</p>
                    {isCrossExamEvidence && hasCrossExamAnnotation ? (
                      <div className="mt-2 space-y-2 text-sm text-amber-900">
                        {parsedCrossExamAnnotation.selfScore != null && (
                          <div className="rounded-lg border border-amber-200/70 bg-white/60 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                              Self score
                            </p>
                            <p className="mt-1">
                              {Math.round(parsedCrossExamAnnotation.selfScore * 100)}%
                            </p>
                          </div>
                        )}
                        {parsedCrossExamAnnotation.reflection && (
                          <div className="rounded-lg border border-amber-200/70 bg-white/60 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                              Reflection
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">
                              {parsedCrossExamAnnotation.reflection}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : hasStructuredAnnotation ? (
                      <div className="mt-2 space-y-2 text-sm text-amber-900">
                        {parsedAnnotation.annotations.length > 0 && (
                          <div className="space-y-1">
                            {parsedAnnotation.annotations.map((annotation) => (
                              <p key={`${item.id}-${annotation.messageIndex}`} className="whitespace-pre-wrap">
                                <span className="font-semibold">Message {annotation.messageIndex}:</span> {annotation.text}
                              </p>
                            ))}
                          </div>
                        )}
                        {parsedAnnotation.reflection && (
                          <div className="rounded-lg border border-amber-200/70 bg-white/60 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                              Reflection
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{parsedAnnotation.reflection}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-amber-900 whitespace-pre-wrap">{item.studentAnnotation}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Faculty Notes
                  </label>
                  <textarea
                    value={item.facultyNotes ?? ''}
                    onChange={(event) =>
                      updateLocalEvidence(item.id, {
                        facultyNotes: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Capture process observations, revision notes, or why this evidence matters."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveEvidence(item)}
                    disabled={savingId === item.id}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002680] disabled:opacity-50"
                  >
                    {savingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
                    Save Evidence Review
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
