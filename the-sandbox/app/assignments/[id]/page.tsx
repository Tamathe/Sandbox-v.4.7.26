'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  PenLine,
  Send,
  Target,
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import StudentMeiView from '../../components/assignments/StudentMeiView'
import AuthenticMetricsCard from '../../components/assessment/AuthenticMetricsCard'
import type {
  AuthenticAssessmentStudentPayload,
  AuthenticToolOption,
} from '../../lib/assessment/types'

import type { RubricCriterion } from '../../components/courses/course-types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullRubric {
  id: string
  title: string
  description: string | null
  criteria: RubricCriterion[]
}

interface MySubmission {
  id: string
  submittedAt: string
  gradebookEntry: {
    status: string
    facultyScore: number | null
    facultyFeedback: string | null
  } | null
}

interface AssignmentDetail {
  id: string
  title: string
  description: string | null
  type: 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE' | 'TOOL_ASSESSMENT'
  assessmentMode: string
  pointsPossible: number
  dueAt: string | null
  isPublished: boolean
  acceptingLate: boolean
  course: { id: string; title: string }
  tool: { id: string; name: string; toolType: string } | null
  rubric: FullRubric | null
  mySubmission: MySubmission | null
}

// ─── Band colour helpers ──────────────────────────────────────────────────────

const BAND_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-800',
  Proficient: 'bg-blue-100 text-blue-800',
  Developing: 'bg-amber-100 text-amber-800',
  Beginning: 'bg-red-100 text-red-800',
}

function bandColor(label: string) {
  return BAND_COLORS[label] ?? 'bg-gray-100 text-gray-700'
}

// ─── Rubric viewer (read-only) ────────────────────────────────────────────────

function RubricViewer({ rubric }: { rubric: FullRubric }) {
  const total = rubric.criteria.reduce((s, c) => s + c.maxPoints, 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-3.5 text-[#0033A0]" />
        <p className="text-xs font-semibold text-gray-700">{rubric.title}</p>
        <span className="ml-auto text-xs text-gray-400">{total} pts total</span>
      </div>
      {rubric.description && (
        <p className="text-xs text-gray-500">{rubric.description}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 min-w-[140px]">
                Criterion
              </th>
              {rubric.criteria[0]?.bands.map((b) => (
                <th
                  key={b.id}
                  className={`border border-gray-200 px-3 py-2 text-left font-semibold min-w-[120px] ${bandColor(b.label)}`}
                >
                  {b.label}
                </th>
              ))}
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 w-16">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="border border-gray-200 px-3 py-2">
                  <p className="font-medium text-gray-900">{c.title}</p>
                  {c.description && (
                    <p className="text-gray-500 mt-0.5">{c.description}</p>
                  )}
                </td>
                {c.bands.map((b) => (
                  <td key={b.id} className="border border-gray-200 px-3 py-2 text-gray-600 leading-relaxed">
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium mb-1 ${bandColor(b.label)}`}>
                      {b.minPoints}–{b.maxPoints} pts
                    </span>
                    <p>{b.description}</p>
                  </td>
                ))}
                <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700 text-center">
                  {c.maxPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Submission status badge ──────────────────────────────────────────────────

function SubmissionBadge({
  submission,
  pointsPossible,
}: {
  submission: MySubmission
  pointsPossible: number
}) {
  const status = submission.gradebookEntry?.status
  if (status === 'RELEASED') {
    const score = submission.gradebookEntry?.facultyScore
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-sm font-medium text-green-700">
        Graded: {score ?? '—'} / {pointsPossible}
      </span>
    )
  }
  if (status === 'NEEDS_REVISION') {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-700">
        Needs revision
      </span>
    )
  }
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700">
      Submitted — grading in progress
    </span>
  )
}

// ─── Submit modal ─────────────────────────────────────────────────────────────

function SubmitModal({
  assignment,
  authHeaders,
  onClose,
  onSubmitted,
}: {
  assignment: AssignmentDetail
  authHeaders: Record<string, string>
  onClose: () => void
  onSubmitted: () => void
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
    fetch(`/api/assignments/${assignment.id}/authentic`, { headers: authHeaders })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json()
          throw new Error(payload.error ?? 'Failed to load your tools')
        }
        return response.json() as Promise<AuthenticAssessmentStudentPayload>
      })
      .then((payload) => {
        setToolOptions(payload.availableTools)
        if (payload.submission?.linkedToolId) {
          setSelectedToolId(payload.submission.linkedToolId)
        } else {
          const firstPublished = payload.availableTools.find((tool) => tool.published)
          setSelectedToolId(firstPublished?.id ?? '')
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load your tools')
      })
      .finally(() => setToolsLoading(false))
  }, [assignment.id, authHeaders, isAuthentic])

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const body =
        isAuthentic
          ? {
              toolId: selectedToolId,
              textContent: textContent.trim() || undefined,
            }
          : assignment.type === 'AI_EXPERIENCE'
            ? { sessionId }
            : { textContent }
      const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
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

  const canSubmit =
    isAuthentic
      ? selectedToolId.trim().length > 0
      : assignment.type === 'AI_EXPERIENCE'
        ? sessionId.trim().length > 0
        : textContent.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Submit: {assignment.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{assignment.pointsPossible} points</p>
        </div>
        <div className="px-6 py-5 space-y-4">
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
                <p className="mt-1 text-xs text-gray-400">
                  Authentic assessment grades the real audience signals on a published tool you created.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reflection or release notes (optional)
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={6}
                  placeholder="What did you change, who is it for, and what feedback shaped the latest version?"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your submission
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={10}
                placeholder="Paste or type your submission here…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
              />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuth()

  const authHeaders: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [authenticData, setAuthenticData] = useState<AuthenticAssessmentStudentPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/assignments/${id}`, { headers: authHeaders })
      if (res.ok) setAssignment(await res.json())
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id, currentUser?.email])

  useEffect(() => {
    if (
      !assignment ||
      assignment.assessmentMode !== 'AUTHENTIC' ||
      currentUser.role !== 'STUDENT'
    ) {
      setAuthenticData(null)
      return
    }

    const authenticHeaders: Record<string, string> = currentUser.email
      ? { 'x-demo-user-email': currentUser.email }
      : {}

    fetch(`/api/assignments/${assignment.id}/authentic`, { headers: authenticHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => setAuthenticData(payload))
      .catch(() => setAuthenticData(null))
  }, [assignment, currentUser.email, currentUser.role])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="font-extrabold text-gray-600 mb-1">Assignment not found</h2>
          <p className="text-sm text-gray-400">It may not be published yet.</p>
        </div>
      </div>
    )
  }

  const isOverdue = assignment.dueAt ? isPast(new Date(assignment.dueAt)) : false
  const hasSubmitted = !!assignment.mySubmission
  const isStudent = currentUser.role === 'STUDENT'
  const isProcessExperience =
    assignment.assessmentMode === 'PROCESS' && assignment.type === 'AI_EXPERIENCE'
  // TASK 29: allow submission when acceptingLate even if overdue
  // TOOL_ASSESSMENT: no manual submit — MEI is auto-computed from sessions
  const canSubmit = isStudent && !hasSubmitted && assignment.isPublished && (!isOverdue || assignment.acceptingLate) && assignment.type !== 'TOOL_ASSESSMENT'

  // Grade card computed values
  const gradebookEntry = assignment.mySubmission?.gradebookEntry ?? null
  const isGradeReleased = gradebookEntry?.status === 'RELEASED'
  const gradeScore = isGradeReleased ? gradebookEntry!.facultyScore : null
  const gradePct =
    gradeScore != null ? Math.round((gradeScore / assignment.pointsPossible) * 100) : null
  const gradePctBadgeClass =
    gradePct == null
      ? 'bg-gray-100 text-gray-500'
      : gradePct >= 80
      ? 'bg-green-100 text-green-700'
      : gradePct >= 60
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'

  const typeLabel = assignment.type === 'AI_EXPERIENCE' ? (isStudent ? 'Practice Session' : 'AI Experience') : assignment.type === 'TOOL_ASSESSMENT' ? 'Tool Assessment' : 'Submission'
  const TypeIcon = assignment.type === 'AI_EXPERIENCE' ? Bot : assignment.type === 'TOOL_ASSESSMENT' ? Target : FileText

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={assignment.title}
        subtitle={`${assignment.course.title} · ${assignment.pointsPossible} pts`}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/courses/${assignment.course.id}/assignments`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="size-4" />
              All Assignments
            </Link>
            {isStudent && (
              <Link
                href={`/assignments/${assignment.id}/workspace`}
                className="flex items-center gap-1.5 rounded-xl border-2 border-[#0033A0] bg-white px-4 py-2 text-sm font-semibold text-[#0033A0] hover:bg-[#0033A0]/5 transition-colors"
              >
                <PenLine className="size-4" />
                {isProcessExperience && !hasSubmitted ? 'Annotate & Submit' : 'Open Workspace'}
              </Link>
            )}
            {canSubmit && !isProcessExperience && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002680] transition-colors"
              >
                <Send className="size-4" />
                Submit
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Assignment metadata card */}
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  assignment.type === 'AI_EXPERIENCE' ? 'bg-purple-100' : assignment.type === 'TOOL_ASSESSMENT' ? 'bg-emerald-100' : 'bg-blue-100'
                }`}
              >
                <TypeIcon
                  className={`size-5 ${
                    assignment.type === 'AI_EXPERIENCE' ? 'text-purple-600' : assignment.type === 'TOOL_ASSESSMENT' ? 'text-emerald-600' : 'text-blue-600'
                  }`}
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-gray-900">{assignment.title}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      assignment.type === 'AI_EXPERIENCE'
                        ? 'bg-purple-100 text-purple-700'
                        : assignment.type === 'TOOL_ASSESSMENT'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {typeLabel}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">{assignment.pointsPossible} points</span>
                  {assignment.dueAt && (
                    <span
                      className={`flex items-center gap-1 ${
                        isOverdue && assignment.acceptingLate
                          ? 'font-medium text-amber-600'
                          : isOverdue
                          ? 'font-medium text-red-500'
                          : ''
                      }`}
                    >
                      <Calendar className="size-3.5" />
                      Due {format(new Date(assignment.dueAt), 'MMM d, yyyy h:mm a')}
                      {isOverdue && !assignment.acceptingLate && ' (past due)'}
                      {isOverdue && assignment.acceptingLate && ' (late submissions accepted)'}
                    </span>
                  )}
                  {assignment.tool && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <Bot className="size-3.5" />
                      {assignment.tool.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Submission status / submit button */}
            {isStudent && (
              <div className="flex items-center gap-3">
                {hasSubmitted ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-green-500" />
                    <SubmissionBadge
                      submission={assignment.mySubmission!}
                      pointsPossible={assignment.pointsPossible}
                    />
                  </div>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-500">
                    Not submitted
                  </span>
                )}
                {canSubmit && !isProcessExperience && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002680] transition-colors"
                  >
                    <Send className="size-4" />
                    Submit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {assignment.description && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {assignment.description}
              </p>
            </div>
          )}
        </div>

        {/* Your Grade card - shown when grade is released */}
        {isStudent && assignment.assessmentMode === 'AUTHENTIC' && (
          authenticData?.submission ? (
            <AuthenticMetricsCard submission={authenticData.submission} />
          ) : (
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-3">
              <h3 className="font-extrabold text-gray-900">Authentic Audience Assessment</h3>
              <p className="text-sm text-gray-600">
                Submit one of your published tools to be graded on real usage, impact, and iteration.
              </p>
              <p className="text-sm text-gray-600">
                {authenticData
                  ? `${authenticData.availableTools.length} tool${authenticData.availableTools.length === 1 ? '' : 's'} ready to review.`
                  : 'Build and publish a tool, then come back here to link it.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {!hasSubmitted && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002680] transition-colors"
                  >
                    Link a Tool
                  </button>
                )}
                <Link
                  href="/build"
                  className="rounded-xl border border-[#0033A0] px-4 py-2 text-sm font-semibold text-[#0033A0] hover:bg-[#0033A0]/5 transition-colors"
                >
                  Open Builder
                </Link>
              </div>
            </div>
          )
        )}

        {isGradeReleased && (
          <div className="rounded-2xl border-2 border-green-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-500" />
                Your Grade
              </h3>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Grade Released
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-gray-900">
                {gradeScore ?? '—'}
              </span>
              <span className="text-lg text-gray-400">/ {assignment.pointsPossible}</span>
              {gradePct != null && (
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${gradePctBadgeClass}`}>
                  {gradePct}%
                </span>
              )}
            </div>
            {gradebookEntry!.facultyFeedback && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Faculty Feedback
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {gradebookEntry!.facultyFeedback}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rubric */}
        {assignment.rubric && (
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="size-5 text-[#0033A0]" />
              Grading Rubric
            </h3>
            <RubricViewer rubric={assignment.rubric} />
          </div>
        )}

        {/* MEI section for TOOL_ASSESSMENT */}
        {assignment.type === 'TOOL_ASSESSMENT' && isStudent && (
          <StudentMeiView assignmentId={assignment.id} authHeaders={authHeaders} />
        )}
      </div>

      {showSubmitModal && (
        <SubmitModal
          assignment={assignment}
          authHeaders={authHeaders}
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={() => {
            setShowSubmitModal(false)
            load()
          }}
        />
      )}
    </div>
  )
}
