'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  FileText,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Star,
  CheckCircle2,
  CheckSquare,
  AlertCircle,
  Users,
  Pin,
  Wand2,
  FlaskConical,
} from 'lucide-react'
import { formatDistanceToNow, format, isPast, addWeeks, addMonths } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import AssignmentWizard from './AssignmentWizard'
import type {
  AuthenticAssessmentStudentPayload,
  AuthenticToolOption,
} from '../../lib/assessment/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RubricSummary {
  id: string
  title: string
}

interface ToolSummary {
  id: string
  name: string
}

interface StudentSubmission {
  id: string
  submittedAt: string
  gradebookEntry: {
    status: string
    facultyScore: number | null
    facultyFeedback: string | null
  } | null
}

interface Assignment {
  id: string
  title: string
  description: string | null
  type: 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'
  assessmentMode: string
  category: string | null
  toolId: string | null
  rubricId: string | null
  dueAt: string | null
  pointsPossible: number
  isPublished: boolean
  acceptingLate: boolean
  canvasAssignmentId: string | null
  rubric: RubricSummary | null
  tool: ToolSummary | null
  _count: { submissions: number }
  submissions?: StudentSubmission[]
}

interface AssignmentsTabProps {
  courseId: string
  courseCode?: string
  isEducator: boolean
  onSwitchToTools?: () => void
}

// ─── Rubric preview types (returned by /rubrics/generate) ─────────────────────

interface RubricBandPreview {
  id: string
  label: string
  minPoints: number
  maxPoints: number
  description: string
}

interface RubricCriterionPreview {
  id: string
  title: string
  description: string | null
  maxPoints: number
  order: number
  bands: RubricBandPreview[]
}

interface GeneratedRubricPreview {
  id: string
  title: string
  criteria: RubricCriterionPreview[]
}

// ─── TASK 34: Assignment template starters ────────────────────────────────────

const ASSIGNMENT_TEMPLATES = [
  {
    label: 'Short Essay',
    title: 'Short Essay',
    description:
      'Write a 2–3 paragraph essay responding to the prompt below. Use evidence from course materials to support your argument.',
    type: 'LEGACY_SUBMISSION' as const,
    pointsPossible: '50',
  },
  {
    label: 'AI Chat Reflection',
    title: 'AI Chat Reflection',
    description:
      'Complete the assigned AI tool session, then write a 200–300 word reflection on what you learned. Paste your session ID to submit.',
    type: 'AI_EXPERIENCE' as const,
    pointsPossible: '25',
  },
  {
    label: 'Quiz Review',
    title: 'Quiz Review',
    description:
      "Complete the quiz review session focused on this week's concepts. Submit your session ID when done.",
    type: 'AI_EXPERIENCE' as const,
    pointsPossible: '20',
  },
  {
    label: 'Peer Critique',
    title: 'Peer Critique',
    description:
      "Read a peer's work and provide constructive feedback using the rubric criteria. Submit your written critique below.",
    type: 'LEGACY_SUBMISSION' as const,
    pointsPossible: '30',
  },
]

// ─── Status badge for student submission state ────────────────────────────────

function SubmissionBadge({ submission, pointsPossible }: { submission?: StudentSubmission; pointsPossible: number }) {
  if (!submission) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Not submitted</span>
  }
  const status = submission.gradebookEntry?.status
  if (status === 'RELEASED') {
    const score = submission.gradebookEntry?.facultyScore
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Graded: {score ?? '—'} / {pointsPossible}
      </span>
    )
  }
  if (status === 'NEEDS_REVISION') {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Needs revision</span>
  }
  return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Submitted — grading in progress</span>
}

// ─── Submission modal for students ───────────────────────────────────────────

function SubmitModal({
  assignment,
  onClose,
  onSubmitted,
  courseHeaders,
}: {
  assignment: Assignment
  onClose: () => void
  onSubmitted: () => void
  courseHeaders: Record<string, string>
}) {
  const [textContent, setTextContent] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [toolOptions, setToolOptions] = useState<AuthenticToolOption[]>([])
  const [selectedToolId, setSelectedToolId] = useState('')
  const [toolsLoading, setToolsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAuthentic = assignment.assessmentMode === 'AUTHENTIC'

  useEffect(() => {
    if (!isAuthentic) return

    setToolsLoading(true)
    fetch(`/api/assignments/${assignment.id}/authentic`, { headers: courseHeaders })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json()
          throw new Error(payload.error ?? 'Failed to load your tools')
        }
        return response.json() as Promise<AuthenticAssessmentStudentPayload>
      })
      .then((payload) => {
        setToolOptions(payload.availableTools)
        const firstPublished = payload.availableTools.find((tool) => tool.published)
        setSelectedToolId(payload.submission?.linkedToolId ?? firstPublished?.id ?? '')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load your tools')
      })
      .finally(() => setToolsLoading(false))
  }, [assignment.id, courseHeaders, isAuthentic])

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const body =
        isAuthentic
          ? { toolId: selectedToolId, textContent: textContent.trim() || undefined }
          : assignment.type === 'AI_EXPERIENCE'
          ? { sessionId }
          : { textContent }

      const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Submission failed')
      }
      onSubmitted()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="font-semibold text-gray-900">Submit: {assignment.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{assignment.pointsPossible} points</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {isAuthentic ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Which tool are you submitting?
                </label>
                {toolsLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="size-4 animate-spin" />
                    Loading your tools...
                  </div>
                ) : toolOptions.length > 0 ? (
                  <select
                    value={selectedToolId}
                    onChange={(e) => setSelectedToolId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                  >
                    <option value="">Select a tool</option>
                    {toolOptions.map((tool) => (
                      <option key={tool.id} value={tool.id} disabled={!tool.published}>
                        {tool.name}
                        {tool.published ? '' : ' (publish first)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    <p>You have not built any tools yet.</p>
                    <Link
                      href="/build"
                      className="mt-2 inline-flex text-sm font-medium text-[#0033A0] hover:text-[#002680]"
                    >
                      Open the Builder
                    </Link>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reflection or release notes (optional)
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  placeholder="What problem does your tool solve, and what changed after feedback?"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
                />
              </div>
            </div>
          ) : assignment.type === 'AI_EXPERIENCE' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat Session ID
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Paste your session ID from the tool"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
              />
              <p className="mt-1 text-xs text-gray-400">
                Complete the {assignment.tool?.name ?? 'assigned tool'} session first, then paste your session ID here.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your submission</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={10}
                placeholder="Paste or type your submission here…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
              />
              {/* TASK 38: live word + char count — informational only */}
              {textContent.length > 0 && (
                <p className="mt-1 text-right text-xs text-gray-400">
                  ~{Math.round(textContent.length / 5)} words · {textContent.length} chars
                </p>
              )}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              (isAuthentic
                ? !selectedToolId.trim()
                : assignment.type === 'LEGACY_SUBMISSION'
                  ? !textContent.trim()
                  : !sessionId.trim())
            }
            className="flex items-center gap-2 rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#002680] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rubric preview panel (shown after AI generation) ─────────────────────────

function RubricPreviewPanel({ rubric }: { rubric: GeneratedRubricPreview }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{rubric.title}</p>
      {rubric.criteria.map((c) => (
        <div key={c.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-800">{c.title}</span>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{c.maxPoints} pts</span>
            </div>
            {expandedId === c.id
              ? <ChevronUp className="size-3.5 shrink-0 text-gray-400" />
              : <ChevronDown className="size-3.5 shrink-0 text-gray-400" />}
          </button>
          {expandedId === c.id && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {c.description && (
                <p className="px-3 py-2 text-xs text-gray-500 italic">{c.description}</p>
              )}
              {c.bands.map((b) => (
                <div key={b.id} className="flex items-start gap-3 px-3 py-2">
                  <span className="mt-0.5 shrink-0 rounded-full bg-[#0033A0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0033A0] w-20 text-center">
                    {b.label}
                  </span>
                  <span className="flex-1 text-xs text-gray-600 leading-relaxed">{b.description}</span>
                  <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap">{b.minPoints}–{b.maxPoints}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Create assignment form (faculty) ─────────────────────────────────────────

function CreateAssignmentForm({
  courseId,
  onCreated,
  onCancel,
  courseHeaders,
}: {
  courseId: string
  onCreated: () => void
  onCancel: () => void
  courseHeaders: Record<string, string>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'>('LEGACY_SUBMISSION')
  const [pointsPossible, setPointsPossible] = useState('100')
  const [dueAt, setDueAt] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // TASK 34: tracks whether user has manually edited any field (hides template chips)
  const [isDirty, setIsDirty] = useState(false)
  // AI rubric generation
  const [generatedRubric, setGeneratedRubric] = useState<GeneratedRubricPreview | null>(null)
  const [generatingRubric, setGeneratingRubric] = useState(false)
  const [rubricError, setRubricError] = useState<string | null>(null)

  const canGenerateRubric = title.trim().length > 0 && Number(pointsPossible) > 0

  async function handleGenerateRubric() {
    if (!canGenerateRubric || generatingRubric) return
    setRubricError(null)
    setGeneratingRubric(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/rubrics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          assignmentTitle: title.trim(),
          assignmentDescription: description.trim() || undefined,
          pointsPossible: Number(pointsPossible),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to generate rubric')
      }
      const rubric: GeneratedRubricPreview = await res.json()
      setGeneratedRubric(rubric)
    } catch (e) {
      setRubricError(e instanceof Error ? e.message : 'Failed to generate rubric')
    } finally {
      setGeneratingRubric(false)
    }
  }

  async function handleCreate() {
    if (!title.trim()) return
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          pointsPossible: Number(pointsPossible),
          dueAt: dueAt || null,
          isPublished,
          ...(generatedRubric ? { rubricId: generatedRubric.id } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to create assignment')
      }
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#0033A0]/20 bg-blue-50/30 p-4 space-y-3">
      <h3 className="font-semibold text-gray-800 text-sm">New Assignment</h3>
      {/* TASK 34: Template chips — hidden once user has edited any field */}
      {!isDirty && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {ASSIGNMENT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => {
                setTitle(tpl.title)
                setDescription(tpl.description)
                setType(tpl.type)
                setPointsPossible(tpl.pointsPossible)
              }}
              className="shrink-0 rounded-full border border-[#0033A0]/30 bg-white px-3 py-1 text-xs font-medium text-[#0033A0] hover:bg-[#0033A0]/5 transition-colors"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
            placeholder="Assignment title"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
            rows={3}
            placeholder="Instructions for students…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value as 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'); setIsDirty(true) }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
          >
            <option value="LEGACY_SUBMISSION">Text / File Upload</option>
            <option value="AI_EXPERIENCE">AI Chat Experience</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Points</label>
          <input
            type="number"
            value={pointsPossible}
            onChange={(e) => { setPointsPossible(e.target.value); setIsDirty(true) }}
            min="0"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
          />
          <div className="mt-1 flex gap-1.5">
            {[10, 25, 50, 100].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => { setPointsPossible(String(n)); setIsDirty(true) }}
                className="rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >{n}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Due date (optional)</label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => { setDueAt(e.target.value); setIsDirty(true) }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
          />
          <div className="mt-1 flex gap-1.5">
            {([
              ['+1 week', addWeeks(new Date(), 1)],
              ['+2 weeks', addWeeks(new Date(), 2)],
              ['+1 month', addMonths(new Date(), 1)],
            ] as [string, Date][]).map(([label, date]) => (
              <button
                key={label}
                type="button"
                onClick={() => { setDueAt(format(date, "yyyy-MM-dd'T'HH:mm")); setIsDirty(true) }}
                className="rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >{label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            id="published"
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="size-4 rounded border-gray-300 accent-[#0033A0]"
          />
          <label htmlFor="published" className="text-sm text-gray-700">Publish immediately</label>
        </div>
      </div>
      {/* AI Rubric Generator */}
      <div className="rounded-xl border border-[#0033A0]/20 bg-blue-50/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-[#0033A0]" />
            <p className="text-xs font-semibold text-gray-700">Rubric <span className="font-normal text-gray-400">(optional)</span></p>
          </div>
          {generatedRubric ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle2 className="size-3" />
                Rubric generated
              </span>
              <button
                type="button"
                onClick={handleGenerateRubric}
                disabled={generatingRubric || !canGenerateRubric}
                className="flex items-center gap-1 text-xs text-[#0033A0] hover:underline disabled:opacity-50"
              >
                {generatingRubric
                  ? <Loader2 className="size-3 animate-spin" />
                  : <RefreshCw className="size-3" />}
                Regenerate
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateRubric}
              disabled={generatingRubric || !canGenerateRubric}
              title={!canGenerateRubric ? 'Enter a title and points first' : undefined}
              className="flex items-center gap-1.5 rounded-lg border border-[#0033A0]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#0033A0] hover:bg-[#0033A0]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generatingRubric
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Wand2 className="size-3.5" />}
              {generatingRubric ? 'Generating…' : 'Generate Rubric with AI'}
            </button>
          )}
        </div>
        {rubricError && (
          <p className="text-xs text-red-600">{rubricError}</p>
        )}
        {!generatedRubric && !generatingRubric && (
          <p className="text-xs text-gray-400">
            AI will generate criteria from your title, description, points, and course learning objectives.
            {!canGenerateRubric && <span className="italic"> Enter a title and points to unlock.</span>}
          </p>
        )}
        {generatingRubric && !generatedRubric && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="size-3.5 animate-spin text-[#0033A0]" />
            <span className="text-xs text-gray-500">Generating rubric with AI…</span>
          </div>
        )}
        {generatedRubric && (
          <RubricPreviewPanel rubric={generatedRubric} />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div className="flex justify-end gap-3 pt-1">
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-medium text-white hover:bg-[#002680] disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {generatedRubric ? 'Create Assignment with Rubric' : 'Create Assignment'}
        </button>
      </div>
    </div>
  )
}

// ─── Canvas assignment ID inline editor (faculty) ────────────────────────────

function CanvasAssignmentIdEditor({
  assignment,
  courseHeaders,
}: {
  assignment: Assignment
  courseHeaders: Record<string, string>
  onSaved?: () => void
}) {
  const [value, setValue] = useState(assignment.canvasAssignmentId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ canvasAssignmentId: value.trim() || null }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Canvas Assignment ID</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 67890"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-[#0033A0]/10 px-3 py-1.5 text-xs font-medium text-[#0033A0] hover:bg-[#0033A0]/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">Used for Canvas grade push when releasing grades.</p>
    </div>
  )
}

// ─── TASK 32: Rubric Quick-Swap inline dropdown ───────────────────────────────

function RubricQuickSwap({
  assignment,
  courseId,
  courseHeaders,
  onSwapped,
}: {
  assignment: Assignment
  courseId: string
  courseHeaders: Record<string, string>
  onSwapped: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rubrics, setRubrics] = useState<RubricSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [swapping, setSwapping] = useState(false)

  async function openDropdown() {
    setOpen(true)
    if (rubrics !== null) return
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/rubrics`, { headers: courseHeaders })
      if (res.ok) {
        const data: { id: string; title: string }[] = await res.json()
        setRubrics(data.map((r) => ({ id: r.id, title: r.title })))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSelect(rubricId: string) {
    setSwapping(true)
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ rubricId }),
      })
      setOpen(false)
      onSwapped()
    } finally {
      setSwapping(false)
    }
  }

  // If rubrics have been fetched and none exist, render nothing
  if (rubrics !== null && rubrics.length === 0) return null

  const trigger = assignment.rubric ? (
    <button
      onClick={openDropdown}
      className="flex items-center gap-1 text-xs text-[#0033A0] hover:underline"
    >
      <ClipboardList className="size-3" />
      {assignment.rubric.title}
    </button>
  ) : (
    <button
      onClick={openDropdown}
      className="text-xs text-[#0033A0] hover:underline"
    >
      + Add rubric
    </button>
  )

  return (
    <div className="relative">
      {trigger}
      {open && (
        <div className="absolute left-0 top-6 z-20 min-w-48 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-semibold text-gray-500">Select rubric</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-1">
              {rubrics?.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  disabled={swapping || r.id === assignment.rubricId}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:opacity-50 ${
                    r.id === assignment.rubricId ? 'font-semibold text-[#0033A0]' : 'text-gray-700'
                  }`}
                >
                  {r.title}
                  {r.id === assignment.rubricId && ' ✓'}
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TASK 33: Submission count drilldown (educator expanded view) ─────────────

interface RecentSubmitter {
  id: string
  submittedAt: string
  student: { name: string; email: string }
  gradebookEntry: { status: string } | null
}

function submissionStatusChip(status: string | undefined) {
  switch (status) {
    case 'AI_DRAFT':
      return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">AI Scoring</span>
    case 'PENDING_REVIEW':
      return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Needs Review</span>
    case 'FACULTY_REVIEWING':
      return <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">In Review</span>
    case 'APPROVED':
    case 'RELEASED':
      return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Graded</span>
    case 'NEEDS_REVISION':
      return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">Needs Revision</span>
    default:
      return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Submitted</span>
  }
}

function SubmissionDrilldown({
  assignmentId,
  courseHeaders,
  onGradeAll,
}: {
  assignmentId: string
  courseHeaders: Record<string, string>
  onGradeAll?: () => void
}) {
  const [submitters, setSubmitters] = useState<RecentSubmitter[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllSubmitters, setShowAllSubmitters] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/assignments/${assignmentId}/submissions`, { headers: courseHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setSubmitters(data) })
      .catch(() => { if (!cancelled) setSubmitters([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Users className="size-3.5 text-gray-400" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Submissions</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="size-3.5 animate-spin text-gray-400" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      ) : submitters && submitters.length > 0 ? (
        <div className="space-y-1.5">
          {(showAllSubmitters ? submitters : submitters.slice(0, 4)).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-gray-800">{s.student.name}</span>
                <span className="text-[11px] text-gray-400">
                  {formatDistanceToNow(new Date(s.submittedAt), { addSuffix: true })}
                </span>
              </div>
              {submissionStatusChip(s.gradebookEntry?.status)}
            </div>
          ))}
          {submitters.length > 4 && (
            <button
              onClick={() => setShowAllSubmitters(v => !v)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllSubmitters ? 'Show less' : `Show all ${submitters.length} submitters`}
            </button>
          )}
          {onGradeAll && (
            <div className="border-t border-gray-200 pt-2 mt-2">
              <button
                onClick={onGradeAll}
                className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
              >
                Grade all →
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No submissions yet.</p>
      )}
    </div>
  )
}

// ─── TASK 42: Points possible inline editor ───────────────────────────────────

function PointsEditor({
  assignment,
  courseHeaders,
  onSaved,
}: {
  assignment: Assignment
  courseHeaders: Record<string, string>
  onSaved?: () => void
}) {
  const [value, setValue] = useState(String(assignment.pointsPossible))
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    const n = Number(value)
    if (!Number.isInteger(n) || n <= 0) return
    if (n === assignment.pointsPossible) return
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ pointsPossible: n }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved?.()
    } catch {
      // silent — user can retry
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Points possible</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min="1"
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          className="w-28 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none"
        />
        {saved && <span className="text-xs font-medium text-green-600">Saved ✓</span>}
      </div>
    </div>
  )
}

// ─── TASK 41: Due-date inline editor ─────────────────────────────────────────

function DueDateEditor({
  assignment,
  courseHeaders,
  onSaved,
}: {
  assignment: Assignment
  courseHeaders: Record<string, string>
  onSaved?: () => void
}) {
  const initialValue = assignment.dueAt ? assignment.dueAt.slice(0, 16) : ''
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    if (value === initialValue) return
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ dueAt: value || null }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved?.()
    } catch {
      // silent — user can retry
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due date</p>
      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none"
        />
        {saved && <span className="text-xs font-medium text-green-600">Saved ✓</span>}
      </div>
    </div>
  )
}

// ─── TASK 43: Assignment type toggle ─────────────────────────────────────────

function TypeToggle({
  assignment,
  courseHeaders,
  onSaved,
}: {
  assignment: Assignment
  courseHeaders: Record<string, string>
  onSaved?: () => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleSwitch(newType: 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE') {
    if (newType === assignment.type || saving) return
    setSaving(true)
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ type: newType }),
      })
      onSaved?.()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignment type</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSwitch('LEGACY_SUBMISSION')}
          disabled={saving}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            assignment.type === 'LEGACY_SUBMISSION'
              ? 'bg-[#0033A0] text-white'
              : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Text / File Upload
        </button>
        <button
          onClick={() => handleSwitch('AI_EXPERIENCE')}
          disabled={saving}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            assignment.type === 'AI_EXPERIENCE'
              ? 'bg-[#0033A0] text-white'
              : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          AI Chat Experience
        </button>
      </div>
    </div>
  )
}

// ─── TASK 44: Late-submission toggle ─────────────────────────────────────────

function LateSubmissionToggle({
  assignment,
  courseHeaders,
  onSaved,
}: {
  assignment: Assignment
  courseHeaders: Record<string, string>
  onSaved?: () => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleToggle() {
    if (saving) return
    setSaving(true)
    try {
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ acceptingLate: !assignment.acceptingLate }),
      })
      onSaved?.()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Late submissions</p>
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          assignment.acceptingLate
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        {assignment.acceptingLate ? 'Accepting late work' : 'Not accepting late work'}
      </button>
    </div>
  )
}

// ─── Generate rubric for an existing assignment ───────────────────────────────

function GenerateRubricForAssignment({
  assignment,
  courseId,
  courseHeaders,
  onGenerated,
}: {
  assignment: Assignment
  courseId: string
  courseHeaders: Record<string, string>
  onGenerated: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (generating) return
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/rubrics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({
          assignmentTitle: assignment.title,
          assignmentDescription: assignment.description ?? undefined,
          pointsPossible: assignment.pointsPossible,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to generate rubric')
      }
      const rubric: { id: string } = await res.json()
      // Attach rubric to assignment
      await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...courseHeaders },
        body: JSON.stringify({ rubricId: rubric.id }),
      })
      onGenerated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-1 text-xs text-[#0033A0] hover:underline disabled:opacity-50 transition-opacity"
      >
        {generating
          ? <Loader2 className="size-3.5 animate-spin" />
          : <Wand2 className="size-3.5" />}
        {generating ? 'Generating…' : 'Generate rubric with AI'}
      </button>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  )
}

// ─── Assignment card ──────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  isEducator,
  courseId,
  onPublishToggle,
  onLateToggle,
  onSubmit,
  onGradeSubmissions,
  onDuplicate,
  onRubricChange,
  courseHeaders,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isPinned,
  onTogglePin,
}: {
  assignment: Assignment
  isEducator: boolean
  courseId: string
  onPublishToggle: (id: string, current: boolean) => void
  onLateToggle?: (id: string, current: boolean) => void
  onSubmit: (a: Assignment) => void
  onGradeSubmissions?: () => void
  onDuplicate?: (a: Assignment) => void
  onRubricChange?: () => void
  courseHeaders: Record<string, string>
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  isPinned?: boolean
  onTogglePin?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isOverdue = assignment.dueAt ? isPast(new Date(assignment.dueAt)) : false
  const studentSub = assignment.submissions?.[0]
  const hasSubmitted = !!studentSub

  return (
    <div className={`rounded-2xl border-2 bg-white ${!assignment.isPublished ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${assignment.type === 'AI_EXPERIENCE' ? 'bg-purple-100' : 'bg-blue-100'}`}>
          {assignment.type === 'AI_EXPERIENCE' ? (
            <Bot className="size-4 text-purple-600" />
          ) : (
            <FileText className="size-4 text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{assignment.title}</span>
            {/* TASK 39: Description tooltip — visible when collapsed and description exists */}
            {!expanded && assignment.description && (
              <div className="group relative inline-flex items-center">
                <Info className="size-3.5 cursor-default text-gray-400" />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                  {assignment.description}
                </div>
              </div>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs ${assignment.type === 'AI_EXPERIENCE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {assignment.type === 'AI_EXPERIENCE' ? (isEducator ? 'AI Experience' : 'Practice Session') : 'Submission'}
            </span>
            {isEducator && assignment.rubricId && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 flex items-center gap-1"><CheckSquare className="size-3" />Rubric</span>
            )}
            {isEducator && !assignment.isPublished && (
              <span className="flex items-center gap-1">
                {isOverdue && <AlertCircle className="size-3.5 shrink-0 text-amber-500" />}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Draft</span>
              </span>
            )}
            {!isEducator && <SubmissionBadge submission={studentSub} pointsPossible={assignment.pointsPossible} />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{assignment.pointsPossible} pts</span>
            {assignment.dueAt && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                <Calendar className="size-3" />
                {isOverdue ? 'Due ' : 'Due '}
                {format(new Date(assignment.dueAt), 'MMM d, yyyy h:mm a')}
              </span>
            )}
            {isOverdue && isEducator && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Overdue</span>
            )}
            {isEducator && assignment.isPublished && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{assignment.submissions?.length ?? 0} submitted</span>
            )}
            {/* TASK 29: Late submission override chip — educator only, past-due published assignments */}
            {isEducator && isOverdue && assignment.isPublished && onLateToggle && (
              <button
                onClick={() => onLateToggle(assignment.id, assignment.acceptingLate)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  assignment.acceptingLate
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
                }`}
              >
                {assignment.acceptingLate ? 'Accepting late work' : 'Accepting late work?'}
              </button>
            )}
            {assignment.rubric && (
              <span className="flex items-center gap-1 text-gray-400">
                <ClipboardList className="size-3" />
                {assignment.rubric.title}
              </span>
            )}
            {isEducator && (
              assignment._count.submissions > 0 && onGradeSubmissions ? (
                <button
                  onClick={onGradeSubmissions}
                  className="flex items-center gap-1 font-semibold text-[#0033A0] hover:underline transition-colors"
                >
                  {assignment._count.submissions} submission{assignment._count.submissions !== 1 ? 's' : ''} — Grade →
                </button>
              ) : (
                <span className="text-gray-400">{assignment._count.submissions} submission{assignment._count.submissions !== 1 ? 's' : ''}</span>
              )
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* TASK 67: Pin icon button — educator only, local state */}
          {isEducator && onTogglePin && (
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(assignment.id) }}
              title={isPinned ? 'Unpin' : 'Pin to top'}
              className="rounded p-1 transition-colors hover:bg-gray-100"
            >
              <span className="rounded-full p-1 hover:bg-gray-100 transition-colors">
                {isPinned
                  ? <Pin className="size-3.5 fill-current text-blue-500" />
                  : <Pin className="size-3.5 text-gray-300" />}
              </span>
            </button>
          )}
          {/* Faculty: publish toggle */}
          {isEducator && (
            <button
              onClick={() => onPublishToggle(assignment.id, assignment.isPublished)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                assignment.isPublished
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {assignment.isPublished ? 'Published' : 'Publish'}
            </button>
          )}
          {/* TASK 30: Up/Down reorder buttons — educator only, local state */}
          {isEducator && onMoveUp && onMoveDown && (
            <>
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                title="Move up"
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                title="Move down"
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown className="size-4" />
              </button>
            </>
          )}
          {/* Student: submit button */}
          {!isEducator && !hasSubmitted && assignment.isPublished && (
            <button
              onClick={() => onSubmit(assignment)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002680]"
            >
              <Send className="size-3" />
              Submit
            </button>
          )}
          {!isEducator && hasSubmitted && (
            <CheckCircle2 className="size-5 text-green-500" />
          )}
          {/* Exam Forge CTA — student only, quiz/exam due within 7 days */}
          {!isEducator && assignment.isPublished && (() => {
            const examCategories = ['quiz', 'exam', 'midterm', 'final']
            const isExamType = examCategories.includes(assignment.category ?? '')
            const dueWithin7Days = assignment.dueAt
              ? (() => {
                  const due = new Date(assignment.dueAt)
                  const now = Date.now()
                  const diff = due.getTime() - now
                  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
                })()
              : false
            if (!isExamType || !dueWithin7Days) return null
            return (
              <a
                href={`/exam-forge?courseId=${courseId}&targetAssignmentId=${assignment.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <FlaskConical className="size-3" />
                Practice
              </a>
            )
          })()}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="rounded-full p-1 hover:bg-gray-100 transition-colors">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </span>
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          {assignment.description && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{assignment.description}</p>
          )}
          {/* Faculty: Canvas assignment ID inline edit */}
          {isEducator && (
            <CanvasAssignmentIdEditor
              assignment={assignment}
              courseHeaders={courseHeaders}
              onSaved={onPublishToggle ? (() => onPublishToggle(assignment.id, assignment.isPublished)) : undefined}
            />
          )}
          {/* TASK 62: Divider between read-only metadata and interactive widgets */}
          {isEducator && <hr className="border-gray-100 my-2" />}
          {/* TASK 42: Points possible inline editor */}
          {isEducator && (
            <PointsEditor
              assignment={assignment}
              courseHeaders={courseHeaders}
              onSaved={onPublishToggle ? (() => onPublishToggle(assignment.id, assignment.isPublished)) : undefined}
            />
          )}
          {/* TASK 41: Due-date inline editor */}
          {isEducator && (
            <DueDateEditor
              assignment={assignment}
              courseHeaders={courseHeaders}
              onSaved={onPublishToggle ? (() => onPublishToggle(assignment.id, assignment.isPublished)) : undefined}
            />
          )}
          {/* TASK 43: Assignment type toggle */}
          {isEducator && (
            <TypeToggle
              assignment={assignment}
              courseHeaders={courseHeaders}
              onSaved={onPublishToggle ? (() => onPublishToggle(assignment.id, assignment.isPublished)) : undefined}
            />
          )}
          {/* TASK 44: Late-submission toggle */}
          {isEducator && (
            <LateSubmissionToggle
              assignment={assignment}
              courseHeaders={courseHeaders}
              onSaved={onPublishToggle ? (() => onPublishToggle(assignment.id, assignment.isPublished)) : undefined}
            />
          )}
          {/* TASK 47: Canvas sync — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Canvas sync</span>
              {assignment.canvasAssignmentId ? (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                  <CheckCircle2 className="size-3" />
                  Synced
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">Not synced</span>
              )}
            </div>
          )}
          {/* TASK 48: Rubric name — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Rubric</span>
              {assignment.rubric ? (
                <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                  <Star className="size-3" />
                  {assignment.rubric.title}
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">No rubric attached</span>
              )}
            </div>
          )}
          {/* TASK 45: Description length — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Description length</span>
              {assignment.description && assignment.description.length > 0 ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {assignment.description.length} characters
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">No description set</span>
              )}
            </div>
          )}
          {/* TASK 49: Points — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Points</span>
              {assignment.pointsPossible > 0 ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {assignment.pointsPossible} pts
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">Ungraded</span>
              )}
            </div>
          )}
          {/* TASK 50: Submissions count — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Submissions</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  assignment._count.submissions === 0
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {assignment._count.submissions === 1
                  ? '1 submission'
                  : `${assignment._count.submissions} submissions`}
              </span>
            </div>
          )}
          {/* TASK 51: Due-date proximity badge — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Due</span>
              {assignment.dueAt ? (() => {
                const due = new Date(assignment.dueAt)
                const now = new Date()
                const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                const colorClass = isPast(due)
                  ? 'bg-red-50 text-red-600'
                  : diffDays <= 3
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
                return (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${colorClass}`}>
                    {format(due, 'MMM d, yyyy')}
                  </span>
                )
              })() : (
                <span className="text-xs italic text-gray-400">No due date</span>
              )}
            </div>
          )}
          {/* TASK 52: Accepting-late badge — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Late work</span>
              {assignment.acceptingLate ? (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Accepted</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Not accepted</span>
              )}
            </div>
          )}
          {/* TASK 53: Assignment type — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Type</span>
              {(() => {
                const typeLabel =
                  assignment.type === 'AI_EXPERIENCE' ? 'AI Chat Experience' :
                  assignment.type === 'LEGACY_SUBMISSION' ? 'Text / File Upload' :
                  assignment.type
                const typeClass =
                  assignment.type === 'AI_EXPERIENCE'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-gray-100 text-gray-600'
                return (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${typeClass}`}>
                    {typeLabel}
                  </span>
                )
              })()}
            </div>
          )}
          {/* TASK 54: Publish-status badge — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Visibility</span>
              {assignment.isPublished ? (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Published</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Draft</span>
              )}
            </div>
          )}
          {/* TASK 55: Points — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Points</span>
              {assignment.pointsPossible != null ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{assignment.pointsPossible} pts</span>
              ) : (
                <span className="text-xs italic text-gray-400">Not graded</span>
              )}
            </div>
          )}
          {/* TASK 56: Description excerpt — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Description</span>
              {assignment.description && assignment.description.trim() ? (
                <span className="text-xs text-gray-600">
                  {assignment.description.trim().length > 120
                    ? assignment.description.trim().slice(0, 120) + '…'
                    : assignment.description.trim()}
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">No description</span>
              )}
            </div>
          )}
          {/* TASK 57: Rubric — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Rubric</span>
              {assignment.rubric ? (
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{assignment.rubric.title}</span>
              ) : (
                <span className="text-xs italic text-gray-400">No rubric</span>
              )}
            </div>
          )}
          {/* TASK 58: Submissions — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Submissions</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{assignment._count.submissions} submitted</span>
            </div>
          )}
          {/* TASK 59: Due date — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Due</span>
              {assignment.dueAt ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  {format(new Date(assignment.dueAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">No due date</span>
              )}
            </div>
          )}
          {/* TASK 60: Assignment type — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Type</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {assignment.type === 'AI_EXPERIENCE' ? 'AI Chat Experience' : 'Text / File Upload'}
              </span>
            </div>
          )}
          {/* TASK 61: Canvas ID — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Canvas ID</span>
              {assignment.canvasAssignmentId ? (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-700">{assignment.canvasAssignmentId}</span>
              ) : (
                <span className="text-xs italic text-gray-400">Not synced</span>
              )}
            </div>
          )}
          {/* TASK 46: Linked tool — read-only display */}
          {isEducator && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold uppercase text-gray-400 w-32 shrink-0">Linked tool</span>
              {assignment.tool ? (
                <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  <Bot className="size-3" />
                  {assignment.tool.name}
                </span>
              ) : (
                <span className="text-xs italic text-gray-400">No tool linked</span>
              )}
            </div>
          )}
          {/* TASK 33: Submission drilldown — educator only, when submissions exist */}
          {isEducator && assignment._count.submissions > 0 && (
            <SubmissionDrilldown
              assignmentId={assignment.id}
              courseHeaders={courseHeaders}
              onGradeAll={onGradeSubmissions}
            />
          )}
          {/* TASK 31 + 32: Educator quick-actions row */}
          {isEducator && (
            <div className="flex items-center gap-4 pt-1">
              {/* TASK 31: Duplicate */}
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(assignment)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                  title="Duplicate assignment as draft"
                >
                  <Copy className="size-3.5" />
                  Duplicate
                </button>
              )}
              {/* TASK 32: Rubric quick-swap */}
              {onRubricChange && (
                <RubricQuickSwap
                  assignment={assignment}
                  courseId={courseId}
                  courseHeaders={courseHeaders}
                  onSwapped={onRubricChange}
                />
              )}
              {/* AI rubric generation — shown when no rubric attached */}
              {onRubricChange && !assignment.rubric && (
                <GenerateRubricForAssignment
                  assignment={assignment}
                  courseId={courseId}
                  courseHeaders={courseHeaders}
                  onGenerated={onRubricChange}
                />
              )}
            </div>
          )}
          {!isEducator && studentSub?.gradebookEntry?.status === 'RELEASED' && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-semibold text-green-800 mb-1">Instructor Feedback</p>
              <p className="text-sm text-green-700">{studentSub.gradebookEntry.facultyFeedback ?? 'No written feedback.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssignmentsTab({ courseId, courseCode, isEducator, onSwitchToTools }: AssignmentsTabProps) {
  const { currentUser } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [submittingFor, setSubmittingFor] = useState<Assignment | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  // TASK 35: local search + type filter (educator only)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'>('ALL')
  // TASK 36: bulk publish state
  const [publishingDrafts, setPublishingDrafts] = useState(false)
  // Show-all toggles for capped lists
  const [showAllAssignments, setShowAllAssignments] = useState(false)
  const [showAllUnpinned, setShowAllUnpinned] = useState(false)
  const [showAllDrafts, setShowAllDrafts] = useState(false)
  // TASK 37: local pin state — resets on reload (by design)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

  const headers: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, { headers })
      if (res.ok) setAssignments(await res.json())
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.email])

  useEffect(() => { load() }, [load])

  async function handlePublishToggle(id: string, current: boolean) {
    await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ isPublished: !current }),
    })
    load()
  }

  // TASK 29: Toggle acceptingLate on a past-due published assignment
  async function handleLateToggle(id: string, current: boolean) {
    await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ acceptingLate: !current }),
    })
    load()
  }

  // TASK 31: Duplicate assignment as a new draft
  async function handleDuplicate(a: Assignment) {
    if (duplicating) return
    setDuplicating(a.id)
    try {
      await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          title: `Copy of ${a.title}`,
          description: a.description ?? undefined,
          type: a.type,
          toolId: a.toolId ?? undefined,
          rubricId: a.rubricId ?? undefined,
          pointsPossible: a.pointsPossible,
          isPublished: false,
        }),
      })
      load()
    } finally {
      setDuplicating(null)
    }
  }

  // TASK 30: Local-only reorder within published or draft group
  function handleMove(id: string, group: 'published' | 'draft', direction: 'up' | 'down') {
    setAssignments((prev) => {
      const inGroup = (a: Assignment) => group === 'published' ? a.isPublished : !a.isPublished
      const groupItems = prev.filter(inGroup)
      const otherItems = prev.filter((a) => !inGroup(a))
      const idx = groupItems.findIndex((a) => a.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= groupItems.length) return prev
      const newGroup = [...groupItems]
      ;[newGroup[idx], newGroup[newIdx]] = [newGroup[newIdx], newGroup[idx]]
      return group === 'published' ? [...newGroup, ...otherItems] : [...otherItems, ...newGroup]
    })
  }

  // TASK 36: Publish all current drafts in parallel then reload
  async function handleBulkPublish() {
    if (publishingDrafts) return
    const draftIds = assignments.filter((a) => !a.isPublished).map((a) => a.id)
    setPublishingDrafts(true)
    try {
      await Promise.all(
        draftIds.map((id) =>
          fetch(`/api/assignments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ isPublished: true }),
          })
        )
      )
      load()
    } finally {
      setPublishingDrafts(false)
    }
  }

  // TASK 37: toggle a pin on an assignment (local only)
  function handleTogglePin(id: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  const published = assignments.filter((a) => a.isPublished)
  const drafts = assignments.filter((a) => !a.isPublished)

  // TASK 35: apply search + type filter independently to each group
  function applyFilter(list: Assignment[]) {
    return list.filter((a) => {
      const matchesSearch = !searchQuery.trim() || a.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'ALL' || a.type === typeFilter
      return matchesSearch && matchesType
    })
  }
  // TASK 37: pinned items float to the top of their group (stable relative order otherwise)
  function sortWithPins(list: Assignment[]) {
    return [...list].sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1
      const pb = pinnedIds.has(b.id) ? 0 : 1
      return pa - pb
    })
  }
  const filteredPublished = sortWithPins(applyFilter(published))
  const filteredDrafts = sortWithPins(applyFilter(drafts))

  // TASK 63: count of overdue unpublished assignments
  const overdueUnpublishedCount = assignments.filter(a => a.dueAt && isPast(new Date(a.dueAt)) && !a.isPublished).length
  // TASK 64: count of published assignments
  const publishedCount = assignments.filter(a => a.isPublished).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Assignments</h2>
            {/* TASK 63: overdue unpublished badge */}
            {isEducator && overdueUnpublishedCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{overdueUnpublishedCount} overdue</span>
            )}
            {/* TASK 64: published count chip */}
            {isEducator && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{publishedCount} published</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isEducator ? `${assignments.length} total` : `${assignments.filter(a => !a.submissions?.length).length} pending`}
          </p>
        </div>
        {isEducator && (
          <div className="flex items-center gap-2">
            <Link
              href={`/courses/${courseId}/assessment-canvas`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <FlaskConical className="size-4" />
              Assessment Canvas
            </Link>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#002680]"
            >
              <Wand2 className="size-4" />
              Assignment Wizard
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Plus className="size-4" />
              Quick Add
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAssignmentForm
          courseId={courseId}
          courseHeaders={headers}
          onCreated={() => { setShowCreate(false); load() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <AssignmentWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        courseId={courseId}
        courseCode={courseCode ?? 'Course'}
        onCreated={() => { setShowWizard(false); load() }}
      />

      {assignments.length === 0 ? (
        !isEducator ? (
          /* TASK 40: Encouraging student empty state */
          <div className="rounded-2xl border-2 border-gray-100 bg-white py-12 text-center">
            <ClipboardList className="mx-auto mb-3 size-10 text-gray-200" />
            <h3 className="text-sm font-semibold text-gray-600">Check back soon</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-xs text-gray-400">
              Your instructor is still setting things up. Enrolled tools for this course are in the{' '}
              <span
                onClick={onSwitchToTools}
                className="font-medium text-[#0033A0] underline cursor-pointer"
              >
                Tools tab
              </span>
              .
            </p>
          </div>
        ) : (
          <div className="py-14 text-center">
            <ClipboardList className="mx-auto mb-3 size-10 text-gray-200" />
            <h3 className="text-sm font-semibold text-gray-600">No assignments yet</h3>
            <p className="mt-1 text-xs text-gray-400">
              Create your first assignment to get students submitting work.
            </p>
          </div>
        )
      ) : isEducator ? (
        // TASK 30: Educator sees two sorted groups with Up/Down reorder buttons
        <div className="space-y-4">
          {/* TASK 35: Search + type filter bar — only when 3+ assignments */}
          {assignments.length >= 3 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assignments…"
                  className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>
              <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
                {(['ALL', 'LEGACY_SUBMISSION', 'AI_EXPERIENCE'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 transition-colors ${typeFilter === t ? 'bg-[#0033A0] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {t === 'ALL' ? 'All' : t === 'LEGACY_SUBMISSION' ? 'Submission' : 'AI Experience'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <h3 className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide text-gray-400 pb-1">
            Published
          </h3>
          {filteredPublished.length > 0 && (() => {
            const pinned = filteredPublished.filter(a => pinnedIds.has(a.id))
            const unpinned = filteredPublished.filter(a => !pinnedIds.has(a.id))
            return (
              <>
                {/* TASK 68: Pinned section — only shown when ≥1 published assignment is pinned */}
                {pinned.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Pinned</h3>
                    {pinned.map((a, i) => (
                      <AssignmentCard
                        key={a.id}
                        assignment={a}
                        isEducator={isEducator}
                        courseId={courseId}
                        onPublishToggle={handlePublishToggle}
                        onLateToggle={handleLateToggle}
                        onSubmit={setSubmittingFor}
                        onGradeSubmissions={onSwitchToTools}
                        onDuplicate={handleDuplicate}
                        onRubricChange={load}
                        courseHeaders={headers}
                        onMoveUp={() => handleMove(a.id, 'published', 'up')}
                        onMoveDown={() => handleMove(a.id, 'published', 'down')}
                        isFirst={i === 0}
                        isLast={i === pinned.length - 1}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                  </div>
                )}
                {unpinned.length > 0 && (
                  <div className="space-y-3">
                    {(showAllUnpinned ? unpinned : unpinned.slice(0, 4)).map((a, i) => (
                      <AssignmentCard
                        key={a.id}
                        assignment={a}
                        isEducator={isEducator}
                        courseId={courseId}
                        onPublishToggle={handlePublishToggle}
                        onLateToggle={handleLateToggle}
                        onSubmit={setSubmittingFor}
                        onGradeSubmissions={onSwitchToTools}
                        onDuplicate={handleDuplicate}
                        onRubricChange={load}
                        courseHeaders={headers}
                        onMoveUp={() => handleMove(a.id, 'published', 'up')}
                        onMoveDown={() => handleMove(a.id, 'published', 'down')}
                        isFirst={i === 0}
                        isLast={i === (showAllUnpinned ? unpinned : unpinned.slice(0, 4)).length - 1}
                        isPinned={false}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                    {unpinned.length > 4 && (
                      <button
                        onClick={() => setShowAllUnpinned(v => !v)}
                        className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {showAllUnpinned ? 'Show less' : `Show all ${unpinned.length} assignments`}
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          })()}
          {filteredPublished.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
              <ClipboardList className="mx-auto size-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">{isEducator ? 'No published assignments yet.' : 'No assignments yet.'}</p>
            </div>
          )}
          {drafts.length > 0 && (
            <>
              {/* TASK 36: Drafts section header — always show when drafts exist so bulk-publish button is visible */}
              <div className="flex items-center justify-between">
                {published.length > 0 ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Drafts</p>
                ) : (
                  <span />
                )}
                <button
                  onClick={handleBulkPublish}
                  disabled={publishingDrafts}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#0033A0] hover:underline disabled:opacity-50"
                >
                  {publishingDrafts && <Loader2 className="size-3 animate-spin" />}
                  Publish all drafts
                </button>
              </div>
              {filteredDrafts.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">No drafts match your filter.</p>
                </div>
              )}
              {filteredDrafts.length > 0 && (
                <div className="space-y-3">
                  {(showAllDrafts ? filteredDrafts : filteredDrafts.slice(0, 4)).map((a, i) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      isEducator={isEducator}
                      courseId={courseId}
                      onPublishToggle={handlePublishToggle}
                      onLateToggle={handleLateToggle}
                      onSubmit={setSubmittingFor}
                      onGradeSubmissions={onSwitchToTools}
                      onDuplicate={handleDuplicate}
                      onRubricChange={load}
                      courseHeaders={headers}
                      onMoveUp={() => handleMove(a.id, 'draft', 'up')}
                      onMoveDown={() => handleMove(a.id, 'draft', 'down')}
                      isFirst={i === 0}
                      isLast={i === (showAllDrafts ? filteredDrafts : filteredDrafts.slice(0, 4)).length - 1}
                      isPinned={pinnedIds.has(a.id)}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                  {filteredDrafts.length > 4 && (
                    <button
                      onClick={() => setShowAllDrafts(v => !v)}
                      className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {showAllDrafts ? 'Show less' : `Show all ${filteredDrafts.length} drafts`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // Student view: single flat list
        <div className="space-y-3">
          {(showAllAssignments ? assignments : assignments.slice(0, 4)).map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              isEducator={isEducator}
              courseId={courseId}
              onPublishToggle={handlePublishToggle}
              onSubmit={setSubmittingFor}
              onGradeSubmissions={onSwitchToTools}
              courseHeaders={headers}
            />
          ))}
          {assignments.length > 4 && (
            <button
              onClick={() => setShowAllAssignments(v => !v)}
              className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAllAssignments ? 'Show less' : `Show all ${assignments.length} assignments`}
            </button>
          )}
        </div>
      )}

      {submittingFor && (
        <SubmitModal
          assignment={submittingFor}
          courseHeaders={headers}
          onClose={() => setSubmittingFor(null)}
          onSubmitted={load}
        />
      )}
    </div>
  )
}
