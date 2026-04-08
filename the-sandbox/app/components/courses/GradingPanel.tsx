'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  User,
  XCircle,
} from 'lucide-react'
import AssessmentEvidencePanel from '../assessment/AssessmentEvidencePanel'
import AuthenticMetricsCard from '../assessment/AuthenticMetricsCard'
import ProcessReviewView from '../assessment/ProcessReviewView'
import DivergenceReviewView from '../assessment/DivergenceReviewView'
import CrossExamScorecard from '../assessment/CrossExamScorecard'
import type {
  AssessmentEvidenceRecord,
  AuthenticAssessmentSubmissionPayload,
} from '../../lib/assessment/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Band {
  label: string
  minPoints: number
  maxPoints: number
  description: string
}

interface Criterion {
  id: string
  title: string
  description: string | null
  maxPoints: number
  order: number
  bands: Band[]
}

interface Rubric {
  id: string
  title: string
  criteria: Criterion[]
}

interface GradingChatMessage {
  role: string
  content: string
  createdAt: string
}

interface FullEntry {
  id: string
  status: string
  compositeMethod: string | null
  processScore: number | null
  aiScore: number | null
  aiRawFeedback: string | null
  aiCriteriaScores: Record<string, { score: number; rationale: string }> | null
  facultyScore: number | null
  facultyFeedback: string | null
  facultyCriteriaScores: Record<string, { score: number; rationale: string }> | null
  evidence: AssessmentEvidenceRecord[]
  authenticAssessment: AuthenticAssessmentSubmissionPayload | null
  submission: {
    id: string
    type: string
    textContent: string | null
    fileUrl: string | null
    fileName: string | null
    submittedAt: string
    student: { id: string; name: string; email: string }
    session: { id: string; messageCount: number; chatMessages: GradingChatMessage[] } | null
    assignment: {
      id: string
      title: string
      description: string | null
      pointsPossible: number
      assessmentMode: string
      evidenceTypes: string[]
      processWeight: number | null
      rubric: Rubric | null
    }
  }
}

interface GradingPanelProps {
  entryId: string
  courseHeaders: Record<string, string>
  onClose: () => void
  onReleased: () => void
  // Queue navigation
  queueIds?: string[]
  onNavigate?: (id: string) => void
}

// ─── Criterion row ────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  aiScore,
  aiRationale,
  facultyScore,
  onScoreChange,
}: {
  criterion: Criterion
  aiScore?: number
  aiRationale?: string
  facultyScore: number | undefined
  onScoreChange: (criterionId: string, score: number) => void
}) {
  const displayScore = facultyScore ?? aiScore
  // Identify the selected band by score range
  const selectedBand =
    displayScore != null
      ? criterion.bands.find((b) => displayScore >= b.minPoints && displayScore <= b.maxPoints) ?? null
      : null

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{criterion.title}</p>
          {criterion.description && (
            <p className="mt-0.5 text-xs text-gray-500">{criterion.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="number"
            min={0}
            max={criterion.maxPoints}
            step={0.5}
            value={displayScore ?? ''}
            onChange={(e) => onScoreChange(criterion.id, parseFloat(e.target.value) || 0)}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm font-medium focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
          />
          <span className="text-xs text-gray-400">/ {criterion.maxPoints}</span>
        </div>
      </div>

      {/* AI rationale */}
      {aiRationale && (
        <div className="flex items-start gap-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2">
          <Bot className="mt-0.5 size-3.5 shrink-0 text-purple-500" />
          <p className="text-xs text-purple-800">{aiRationale}</p>
        </div>
      )}

      {/* Band radio buttons — always visible */}
      {criterion.bands.length > 0 && (
        <div className="space-y-1.5">
          {criterion.bands.map((band) => {
            const isSelected = selectedBand?.label === band.label
            return (
              <button
                key={band.label}
                type="button"
                onClick={() => onScoreChange(criterion.id, band.maxPoints)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-[#0033A0] bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-[#0033A0]/40 hover:bg-blue-50/30'
                }`}
              >
                {/* Radio circle */}
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected ? 'border-[#0033A0]' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <span className="size-2 rounded-full bg-[#0033A0]" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#0033A0]' : 'text-gray-700'}`}>
                      {band.label}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">{band.minPoints}–{band.maxPoints} pts</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 leading-relaxed">{band.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GradingPanel({ entryId, courseHeaders, onClose, onReleased, queueIds = [], onNavigate }: GradingPanelProps) {
  const [entry, setEntry] = useState<FullEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facultyFeedback, setFacultyFeedback] = useState('')
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({})
  const [showTranscript, setShowTranscript] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [showRevisionPrompt, setShowRevisionPrompt] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')
  const [confirmUndoRelease, setConfirmUndoRelease] = useState(false)
  const [undoing, setUndoing] = useState(false)

  const currentIndex = queueIds.indexOf(entryId)
  const prevId = currentIndex > 0 ? queueIds[currentIndex - 1] : null
  const nextId = currentIndex >= 0 && currentIndex < queueIds.length - 1 ? queueIds[currentIndex + 1] : null

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/gradebook/${entryId}`, { headers: courseHeaders })
        if (res.ok) {
          const data: FullEntry = await res.json()
          setEntry(data)
          setFacultyFeedback(data.facultyFeedback ?? data.aiRawFeedback ?? '')
          // Seed criteria scores from faculty (if set) or AI
          const initial: Record<string, number> = {}
          const rubric = data.submission.assignment.rubric
          rubric?.criteria.forEach((c) => {
            const fac = (data.facultyCriteriaScores ?? {})[c.id]
            const ai = (data.aiCriteriaScores ?? {})[c.id]
            if (fac?.score != null) initial[c.id] = fac.score
            else if (ai?.score != null) initial[c.id] = ai.score
          })
          setCriteriaScores(initial)
          window.dispatchEvent(new CustomEvent('uky-grading-open', {
            detail: {
              entryId,
              studentName: data.submission.student.name,
              assignmentTitle: data.submission.assignment.title,
            },
          }))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      window.dispatchEvent(new CustomEvent('uky-grading-close'))
    }
  }, [entryId, courseHeaders])

  function handleCriterionScore(criterionId: string, score: number) {
    setCriteriaScores((prev) => ({ ...prev, [criterionId]: score }))
  }

  function computeTotalScore(): number {
    if (!entry) return 0

    if (!entry?.submission.assignment.rubric) {
      return (
        criteriaScores['manual'] ??
        entry.facultyScore ??
        entry.aiScore ??
        0
      )
    }

    return Math.round(
      Object.values(criteriaScores).reduce((sum, s) => sum + s, 0) * 10
    ) / 10
  }

  async function handleSave(andRelease = false) {
    if (!entry) return
    setError(null)
    if (andRelease) setReleasing(true)
    else setSaving(true)

    try {
      const rubric = entry.submission.assignment.rubric
      const facCriteriaScores = rubric
        ? Object.fromEntries(
            rubric.criteria.map((c) => [
              c.id,
              {
                score: criteriaScores[c.id] ?? 0,
                rationale: (entry.aiCriteriaScores ?? {})[c.id]?.rationale ?? '',
              },
            ])
          )
        : {}

      const totalScore = rubric ? computeTotalScore() : undefined

      // Save patch
      await fetch(`/api/gradebook/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          facultyScore: totalScore,
          facultyFeedback,
          facultyCriteriaScores: facCriteriaScores,
          status: andRelease ? 'APPROVED' : 'FACULTY_REVIEWING',
        }),
      })

      if (andRelease) {
        const rel = await fetch(`/api/gradebook/${entryId}/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...courseHeaders },
        })
        if (!rel.ok) {
          const d = await rel.json()
          throw new Error(d.error ?? 'Release failed')
        }
        setConfirmRelease(false)
        // Advance to next in queue, or close if done
        if (nextId && onNavigate) {
          onNavigate(nextId)
        } else {
          onReleased()
        }
      } else {
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setConfirmRelease(false)
    } finally {
      setSaving(false)
      setReleasing(false)
    }
  }

  async function handleNeedsRevision() {
    if (!entry) return
    setError(null)
    setSaving(true)
    try {
      await fetch(`/api/gradebook/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          facultyFeedback: revisionNote || facultyFeedback,
          status: 'NEEDS_REVISION',
        }),
      })
      setShowRevisionPrompt(false)
      setRevisionNote('')
      if (nextId && onNavigate) {
        onNavigate(nextId)
      } else {
        onReleased()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleUndoRelease() {
    if (!entry) return
    setError(null)
    setUndoing(true)
    try {
      const recallNote = `[Grade recalled by faculty on ${new Date().toLocaleDateString()}]\n\n`
      await fetch(`/api/gradebook/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          status: 'APPROVED',
          facultyFeedback: recallNote + (entry.facultyFeedback ?? ''),
        }),
      })
      setConfirmUndoRelease(false)
      // Reload entry
      const res = await fetch(`/api/gradebook/${entryId}`, { headers: courseHeaders })
      if (res.ok) {
        const data: FullEntry = await res.json()
        setEntry(data)
        setFacultyFeedback(data.facultyFeedback ?? '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Undo failed')
    } finally {
      setUndoing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }
  if (!entry) return <div className="py-8 text-center text-sm text-gray-500">Entry not found</div>

  const rubric = entry.submission.assignment.rubric
  const totalScore = computeTotalScore()
  const maxPts = entry.submission.assignment.pointsPossible
  const isProcessSubmission =
    entry.submission.assignment.assessmentMode === 'PROCESS' &&
    entry.submission.type === 'AI_EXPERIENCE' &&
    Boolean(entry.submission.session)
  const divergenceEvidence = entry.evidence.find(
    (item) => item.evidenceType === 'SIMULATION_THREAD'
  )
  const crossExamEvidence = entry.evidence.find(
    (item) =>
      item.evidenceType === 'DEBATE_SESSION' ||
      item.evidenceType === 'FISHBOWL_SESSION'
  )
  const authenticEvidenceId = entry.authenticAssessment?.evidenceId ?? null

  return (
    <div className="space-y-5">
      {/* Back nav + queue progress */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to gradebook
        </button>
        {queueIds.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {currentIndex + 1} of {queueIds.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevId && onNavigate?.(prevId)}
                disabled={!prevId}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-[#0033A0] hover:text-[#0033A0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous submission"
              >
                <ArrowLeft className="size-3.5" />
              </button>
              <button
                onClick={() => nextId && onNavigate?.(nextId)}
                disabled={!nextId}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-[#0033A0] hover:text-[#0033A0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next submission"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">{entry.submission.assignment.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                {entry.submission.student.name}
              </span>
              <span className="text-gray-300">|</span>
              <span>{entry.submission.student.email}</span>
              {entry.submission.assignment.assessmentMode !== 'TRADITIONAL' && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#0033A0]">
                    {entry.submission.assignment.assessmentMode.replace('_', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#0033A0]">
              {totalScore}
              <span className="text-sm font-normal text-gray-400"> / {maxPts}</span>
            </p>
            {entry.aiScore != null && (
              <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                <Bot className="size-3" />
                AI draft: {entry.aiScore}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: submission content */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Submission</h3>
          {divergenceEvidence ? (
            <DivergenceReviewView
              roomId={divergenceEvidence.sourceId}
              courseHeaders={courseHeaders}
              studentId={entry.submission.student.id}
            />
          ) : crossExamEvidence ? (
            <CrossExamScorecard
              roomId={crossExamEvidence.sourceId}
              courseHeaders={courseHeaders}
              userId={entry.submission.student.id}
            />
          ) : isProcessSubmission && entry.submission.session ? (
            <ProcessReviewView
              sessionId={entry.submission.session.id}
              courseHeaders={courseHeaders}
              onEvidenceUpdated={({ evidence, summary }) =>
                setEntry((prev) =>
                  prev
                    ? {
                        ...prev,
                        evidence: prev.evidence.some((item) => item.id === evidence.id)
                          ? prev.evidence.map((item) => (item.id === evidence.id ? evidence : item))
                          : [evidence, ...prev.evidence],
                        processScore: summary.processScore,
                        compositeMethod: summary.compositeMethod,
                      }
                    : prev
                )
              }
            />
          ) : entry.submission.type === 'AI_EXPERIENCE' && entry.submission.session ? (
            <div className="rounded-2xl border-2 border-gray-200 bg-white">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-purple-500" />
                  AI Chat Transcript ({entry.submission.session.messageCount} messages)
                </span>
                {showTranscript ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {showTranscript && (
                <div className="border-t border-gray-100 max-h-96 overflow-y-auto p-4 space-y-3">
                  {entry.submission.session.chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${msg.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {msg.role === 'user' ? 'S' : 'AI'}
                      </div>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${msg.role === 'user' ? 'bg-gray-100 text-gray-800' : 'bg-purple-50 text-purple-900'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {entry.submission.textContent ?? entry.submission.fileName ?? '(No content)'}
              </p>
            </div>
          )}

          {/* AI overall feedback */}
          {entry.aiRawFeedback && (
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                <Bot className="size-3.5" />
                AI Overall Feedback
              </p>
              <p className="text-sm text-purple-800 leading-relaxed">{entry.aiRawFeedback}</p>
            </div>
          )}

          {entry.authenticAssessment ? (
            <AuthenticMetricsCard
              submission={entry.authenticAssessment}
              courseHeaders={courseHeaders}
              onEvidenceSaved={({ facultyScore, facultyNotes }) =>
                setEntry((prev) =>
                  prev && authenticEvidenceId
                    ? {
                        ...prev,
                        evidence: prev.evidence.map((item) =>
                          item.id === authenticEvidenceId
                            ? {
                                ...item,
                                facultyScore,
                                facultyNotes,
                              }
                            : item
                        ),
                        authenticAssessment: {
                          ...prev.authenticAssessment!,
                          evidenceFacultyScore: facultyScore,
                          evidenceFacultyNotes: facultyNotes,
                        },
                      }
                    : prev
                )
              }
            />
          ) : null}

          <AssessmentEvidencePanel
            entryId={entry.id}
            evidence={entry.evidence ?? []}
            processScore={entry.processScore}
            compositeMethod={entry.compositeMethod}
            courseHeaders={courseHeaders}
            transcriptSource={
              entry.submission.session
                ? {
                    sourceId: entry.submission.session.id,
                    sourceLabel: `Sandy transcript: ${entry.submission.assignment.title}`,
                  }
                : null
            }
            onEvidenceChange={({ evidence, processScore, compositeMethod }) =>
              setEntry((prev) =>
                prev
                  ? {
                      ...prev,
                      evidence,
                      processScore,
                      compositeMethod,
                    }
                  : prev
              )
            }
          />
        </div>

        {/* Right: rubric + faculty inputs */}
        <div className="space-y-4">
          {rubric ? (
            <>
              <h3 className="text-sm font-semibold text-gray-700">Rubric: {rubric.title}</h3>
              <div className="space-y-3">
                {rubric.criteria.map((c) => (
                  <CriterionRow
                    key={c.id}
                    criterion={c}
                    aiScore={(entry.aiCriteriaScores ?? {})[c.id]?.score}
                    aiRationale={(entry.aiCriteriaScores ?? {})[c.id]?.rationale}
                    facultyScore={criteriaScores[c.id]}
                    onScoreChange={handleCriterionScore}
                  />
                ))}
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Score</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxPts}
                  step={0.5}
                  value={criteriaScores['manual'] ?? entry.aiScore ?? ''}
                  onChange={(e) => handleCriterionScore('manual', parseFloat(e.target.value) || 0)}
                  className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-bold focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                />
                <span className="text-gray-500">/ {maxPts}</span>
              </div>
            </div>
          )}

          {/* Faculty feedback textarea */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Feedback
            </label>
            <textarea
              value={facultyFeedback}
              onChange={(e) => setFacultyFeedback(e.target.value)}
              rows={5}
              placeholder="Write feedback for the student. They'll see this when the grade is released."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {/* Needs Revision prompt */}
          {showRevisionPrompt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="size-4" />
                What should {entry.submission.student.name.split(' ')[0]} revise?
              </p>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={3}
                placeholder="Explain what needs to change. The student will see this with their feedback."
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRevisionPrompt(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-amber-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNeedsRevision}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Send Revision Request
                </button>
              </div>
            </div>
          )}

          {/* Release confirmation card */}
          {confirmRelease && (
            <div className="rounded-xl border border-[#0033A0]/30 bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-[#0033A0]">
                Return grade to {entry.submission.student.name}?
              </p>
              <p className="text-xs text-blue-700">
                Score <strong>{computeTotalScore()} / {entry.submission.assignment.pointsPossible}</strong> will be visible to the student immediately and they&apos;ll be notified.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmRelease(false)}
                  disabled={releasing}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <XCircle className="size-3.5" />
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={releasing}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002680] disabled:opacity-50"
                >
                  {releasing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  Confirm & Return Grade
                </button>
              </div>
            </div>
          )}

          {/* Undo Release — shown when grade has already been released */}
          {entry.status === 'RELEASED' && !confirmUndoRelease && (
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setConfirmUndoRelease(true)}
                disabled={undoing}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                <RotateCcw className="size-4" />
                Undo Release
              </button>
            </div>
          )}

          {/* Undo Release confirmation */}
          {entry.status === 'RELEASED' && confirmUndoRelease && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Return this grade to draft?
              </p>
              <p className="text-xs text-amber-700">The student will lose visibility of this grade immediately.</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmUndoRelease(false)}
                  disabled={undoing}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-amber-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUndoRelease}
                  disabled={undoing}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {undoing ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                  Recall Grade
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!confirmRelease && !showRevisionPrompt && entry.status !== 'RELEASED' && (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                onClick={() => handleSave(false)}
                disabled={saving || releasing}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Save Draft
              </button>
              <button
                onClick={() => setShowRevisionPrompt(true)}
                disabled={saving || releasing}
                className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                <AlertTriangle className="size-4" />
                Needs Revision
              </button>
              <button
                onClick={() => setConfirmRelease(true)}
                disabled={saving || releasing}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#002680] disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                Approve & Release
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
