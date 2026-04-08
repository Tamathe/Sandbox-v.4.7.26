'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'

import type { RubricBand, RubricCriterion } from '../../../components/courses/course-types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullRubric {
  id: string
  title: string
  description: string | null
  criteria: RubricCriterion[]
}

interface Assignment {
  id: string
  title: string
  description: string | null
  type: 'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'
  rubricId: string | null
  rubric: { id: string; title: string } | null
  tool: { id: string; name: string } | null
  dueAt: string | null
  pointsPossible: number
  isPublished: boolean
  _count: { submissions: number }
  // educator-only enrichment
  submissionCount?: number
  enrolledCount?: number
  avgAiScore?: number | null
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

// ─── Inline rubric viewer ─────────────────────────────────────────────────────

function RubricViewer({
  rubric,
  loading,
}: {
  rubric: FullRubric | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <Loader2 className="size-4 animate-spin" />
        Loading rubric…
      </div>
    )
  }
  if (!rubric) return null

  const total = rubric.criteria.reduce((s, c) => s + c.maxPoints, 0)

  return (
    <div className="space-y-3 pt-1">
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

// ─── Assignment row ───────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  // Shift to local time and format as YYYY-MM-DDTHH:MM
  const offset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

// ─── Assignment row ───────────────────────────────────────────────────────────

function AssignmentRow({
  assignment,
  isEducator,
  authHeaders,
  onRubricExpand,
  onDueDateSave,
  onPublishToggle,
  onDelete,
  rubricDetail,
  rubricLoading,
}: {
  assignment: Assignment
  isEducator: boolean
  authHeaders: Record<string, string>
  onRubricExpand: (rubricId: string) => void
  onDueDateSave: (id: string, newDueAt: string | null) => void
  onPublishToggle: (id: string, newPublished: boolean) => void
  onDelete: (id: string) => void
  rubricDetail: FullRubric | null
  rubricLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [editingDueAt, setEditingDueAt] = useState(false)
  const [draftDueAt, setDraftDueAt] = useState('')
  const [savingDueAt, setSavingDueAt] = useState(false)
  const [togglingPublish, setTogglingPublish] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isOverdue = assignment.dueAt ? isPast(new Date(assignment.dueAt)) : false
  const hasRubric = !!assignment.rubric

  function toggleExpand() {
    if (!expanded && hasRubric) {
      onRubricExpand(assignment.rubric!.id)
    }
    setExpanded((v) => !v)
  }

  function openDueDateEditor(e: React.MouseEvent) {
    e.stopPropagation()
    setDraftDueAt(assignment.dueAt ? toDatetimeLocal(assignment.dueAt) : '')
    setEditingDueAt(true)
  }

  async function handleDueDateSave() {
    const newDueAt = draftDueAt ? new Date(draftDueAt).toISOString() : null
    const prevDueAt = assignment.dueAt
    setSavingDueAt(true)
    setEditingDueAt(false)
    onDueDateSave(assignment.id, newDueAt) // optimistic
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ dueAt: newDueAt }),
      })
      if (!res.ok) onDueDateSave(assignment.id, prevDueAt) // revert
    } catch {
      onDueDateSave(assignment.id, prevDueAt)
    } finally {
      setSavingDueAt(false)
    }
  }

  async function handlePublishToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const newPublished = !assignment.isPublished
    setTogglingPublish(true)
    onPublishToggle(assignment.id, newPublished) // optimistic
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ isPublished: newPublished }),
      })
      if (!res.ok) onPublishToggle(assignment.id, !newPublished) // revert
    } catch {
      onPublishToggle(assignment.id, !newPublished)
    } finally {
      setTogglingPublish(false)
    }
  }

  // Educator analytics strip values
  const subCount = assignment.submissionCount ?? assignment._count.submissions
  const enrolled = assignment.enrolledCount ?? 0
  const pct = enrolled > 0 ? Math.min(100, Math.round((subCount / enrolled) * 100)) : 0
  const showAnalytics = isEducator && assignment.isPublished && assignment.enrolledCount != null

  return (
    <div className={`rounded-2xl border-2 bg-white overflow-hidden ${confirmDelete ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Delete confirmation */}
      {confirmDelete ? (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50">
          <span className="flex-1 text-sm font-medium text-red-700">
            Delete this assignment? This cannot be undone.
          </span>
          <button
            onClick={() => onDelete(assignment.id)}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
      <>
      {/* Row header */}
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Type icon */}
        <div
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
            assignment.type === 'AI_EXPERIENCE' ? 'bg-purple-100' : 'bg-blue-100'
          }`}
        >
          {assignment.type === 'AI_EXPERIENCE' ? (
            <Bot className="size-4 text-purple-600" />
          ) : (
            <FileText className="size-4 text-blue-600" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{assignment.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                assignment.type === 'AI_EXPERIENCE'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {assignment.type === 'AI_EXPERIENCE' ? (isEducator ? 'AI Experience' : 'Practice Session') : 'Submission'}
            </span>
            {isEducator && !assignment.isPublished && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                Draft
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{assignment.pointsPossible} pts</span>

            {/* Due date + inline editor */}
            <span className="flex items-center gap-1">
              {assignment.dueAt ? (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                  <Calendar className="size-3" />
                  Due {format(new Date(assignment.dueAt), 'MMM d, yyyy h:mm a')}
                  {isOverdue && ' (past due)'}
                </span>
              ) : (
                <span className="text-gray-400 flex items-center gap-1">
                  <Calendar className="size-3" />
                  No due date
                </span>
              )}
              {isEducator && !savingDueAt && (
                <button
                  onClick={openDueDateEditor}
                  className="ml-0.5 rounded p-0.5 text-gray-300 hover:text-[#0033A0] hover:bg-blue-50 transition-colors"
                  aria-label="Edit due date"
                >
                  <Pencil className="size-3" />
                </button>
              )}
              {isEducator && savingDueAt && <Loader2 className="size-3 animate-spin text-gray-400 ml-0.5" />}
            </span>

            {isEducator && (
              <span>
                {assignment._count.submissions}{' '}
                {assignment._count.submissions === 1 ? 'submission' : 'submissions'}
              </span>
            )}

            {assignment.tool && (
              <span className="flex items-center gap-1 text-gray-400">
                <Bot className="size-3" />
                {assignment.tool.name}
              </span>
            )}

            {hasRubric && (
              <button
                onClick={toggleExpand}
                className="flex items-center gap-1 text-[#0033A0] hover:underline font-medium"
              >
                <ClipboardList className="size-3" />
                {assignment.rubric!.title}
              </button>
            )}
          </div>

          {/* Inline due-date popover */}
          {editingDueAt && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-md">
              <input
                type="datetime-local"
                value={draftDueAt}
                onChange={(e) => setDraftDueAt(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
              />
              <button
                onClick={handleDueDateSave}
                className="rounded-lg bg-[#0033A0] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#002680] transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditingDueAt(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Cancel"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>

        {/* Publish toggle — educator only */}
        {isEducator && (
          <button
            onClick={handlePublishToggle}
            disabled={togglingPublish}
            className={`shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
              assignment.isPublished
                ? 'text-[#0033A0] hover:bg-blue-50'
                : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
            }`}
            aria-label={assignment.isPublished ? 'Unpublish assignment' : 'Publish assignment'}
            title={assignment.isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
          >
            {togglingPublish ? (
              <Loader2 className="size-4 animate-spin" />
            ) : assignment.isPublished ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </button>
        )}

        {/* Delete button — educator only */}
        {isEducator && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label="Delete assignment"
            title="Delete assignment"
          >
            <Trash2 className="size-4" />
          </button>
        )}

        {/* Expand toggle */}
        {(assignment.description || hasRubric) && (
          <button
            onClick={toggleExpand}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </div>

      {/* Educator analytics strip */}
      {showAnalytics && (
        <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {subCount} / {enrolled} submitted
          </span>
          <div className="w-28 h-1.5 rounded-full bg-gray-200 overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-[#0033A0] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-gray-400">{pct}%</span>
          {assignment.avgAiScore != null && (
            <span>
              Avg AI Score:{' '}
              <span className="font-semibold text-gray-700">{assignment.avgAiScore}%</span>
            </span>
          )}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
          {assignment.description && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {assignment.description}
            </p>
          )}
          {hasRubric && (
            <RubricViewer
              rubric={rubricDetail}
              loading={rubricLoading}
            />
          )}
        </div>
      )}
      </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'

  const authHeaders: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  // Cache of fully-loaded rubrics keyed by rubricId
  const [rubricCache, setRubricCache] = useState<Record<string, FullRubric>>({})
  const [loadingRubricId, setLoadingRubricId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        headers: authHeaders,
      })
      if (res.ok) setAssignments(await res.json())
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUser?.email])

  useEffect(() => { load() }, [load])

  async function handleRubricExpand(rubricId: string) {
    if (rubricCache[rubricId]) return // already cached
    setLoadingRubricId(rubricId)
    try {
      const res = await fetch(`/api/courses/${courseId}/rubrics`, { headers: authHeaders })
      if (!res.ok) return
      const rubrics: FullRubric[] = await res.json()
      const map: Record<string, FullRubric> = {}
      rubrics.forEach((r) => { map[r.id] = r })
      setRubricCache((prev) => ({ ...prev, ...map }))
    } finally {
      setLoadingRubricId(null)
    }
  }

  function handleDueDateSave(assignmentId: string, newDueAt: string | null) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, dueAt: newDueAt } : a))
    )
  }

  function handlePublishToggle(assignmentId: string, newPublished: boolean) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, isPublished: newPublished } : a))
    )
  }

  async function handleDelete(assignmentId: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      if (!res.ok) load()
    } catch {
      load()
    }
  }

  const published = assignments.filter((a) => a.isPublished)
  const drafts = assignments.filter((a) => !a.isPublished)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Assignments"
        subtitle={
          isEducator
            ? `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} · ${published.length} published`
            : `${published.length} assignment${published.length !== 1 ? 's' : ''}`
        }
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/courses?course=${courseId}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="size-4" />
              Course
            </Link>
            {isEducator && (
              <Link
                href={`/courses/${courseId}/assignments/new`}
                className="flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002680] transition-colors"
              >
                <Plus className="size-4" />
                New Assignment
              </Link>
            )}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-[#0033A0]" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border-2 border-gray-200 bg-white py-20 text-center">
            <ClipboardList className="mx-auto mb-3 size-12 text-gray-200" />
            <h2 className="font-extrabold text-gray-600 mb-1">
              {isEducator ? 'No assignments yet' : 'No assignments available'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {isEducator
                ? 'Create your first assignment to get students submitting work.'
                : 'Your instructor hasn\'t published any assignments yet.'}
            </p>
            {isEducator && (
              <Link
                href={`/courses/${courseId}/assignments/new`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002680] transition-colors"
              >
                <Plus className="size-4" />
                Create First Assignment
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Published */}
            {published.length > 0 && (
              <section className="space-y-3">
                {isEducator && (
                  <h2 className="font-extrabold text-gray-900">
                    Published
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({published.length})
                    </span>
                  </h2>
                )}
                {published.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    isEducator={isEducator}
                    authHeaders={authHeaders}
                    onRubricExpand={handleRubricExpand}
                    onDueDateSave={handleDueDateSave}
                    onPublishToggle={handlePublishToggle}
                    onDelete={handleDelete}
                    rubricDetail={a.rubric ? rubricCache[a.rubric.id] ?? null : null}
                    rubricLoading={loadingRubricId === a.rubric?.id}
                  />
                ))}
              </section>
            )}

            {/* Drafts — educator only */}
            {isEducator && drafts.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-extrabold text-gray-900">
                  Drafts
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({drafts.length})
                  </span>
                </h2>
                {drafts.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    isEducator={isEducator}
                    authHeaders={authHeaders}
                    onRubricExpand={handleRubricExpand}
                    onDueDateSave={handleDueDateSave}
                    onPublishToggle={handlePublishToggle}
                    onDelete={handleDelete}
                    rubricDetail={a.rubric ? rubricCache[a.rubric.id] ?? null : null}
                    rubricLoading={loadingRubricId === a.rubric?.id}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
