'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseTool {
  id: string
  name: string
  toolType: string
}

import type { RubricBand, RubricCriterion } from '../../../../components/courses/course-types'

interface GeneratedRubric {
  id: string
  title: string
  courseId: string
  criteria: RubricCriterion[]
}

// ─── Band colour helpers ──────────────────────────────────────────────────────

const BAND_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-800 border border-green-200',
  Proficient: 'bg-blue-100 text-blue-800 border border-blue-200',
  Developing: 'bg-amber-100 text-amber-800 border border-amber-200',
  Beginning: 'bg-red-100 text-red-800 border border-red-200',
}

function bandColor(label: string) {
  return BAND_COLORS[label] ?? 'bg-gray-100 text-gray-700 border border-gray-200'
}

// ─── Rubric preview panel ─────────────────────────────────────────────────────

function RubricPreview({ rubric }: { rubric: GeneratedRubric }) {
  const total = rubric.criteria.reduce((s, c) => s + c.maxPoints, 0)
  return (
    <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-blue-50/40 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-[#0033A0]" />
        <h3 className="font-bold text-gray-900 text-sm">{rubric.title}</h3>
        <span className="ml-auto rounded-full bg-[#0033A0]/10 px-2 py-0.5 text-xs font-medium text-[#0033A0]">
          {total} pts
        </span>
      </div>
      <div className="space-y-3">
        {rubric.criteria.map((c) => (
          <div key={c.id} className="rounded-2xl border-2 border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                {c.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                )}
              </div>
              <span className="shrink-0 text-xs font-medium text-gray-500">{c.maxPoints} pts</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {c.bands.map((b) => (
                <span
                  key={b.id}
                  title={b.description}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${bandColor(b.label)}`}
                >
                  {b.label}: {b.minPoints}–{b.maxPoints}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewAssignmentPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const { currentUser } = useAuth()
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'

  const authHeaders: Record<string, string> = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}
  const jsonHeaders: Record<string, string> = { ...authHeaders, 'Content-Type': 'application/json' }

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'LEGACY_SUBMISSION' | 'AI_EXPERIENCE'>('LEGACY_SUBMISSION')
  const [toolId, setToolId] = useState('')
  const [pointsPossible, setPointsPossible] = useState('100')
  const [dueAt, setDueAt] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  // ── Rubric state ────────────────────────────────────────────────────────────
  const [generatedRubric, setGeneratedRubric] = useState<GeneratedRubric | null>(null)
  const [generatingRubric, setGeneratingRubric] = useState(false)
  const [rubricError, setRubricError] = useState<string | null>(null)

  // ── Save state ──────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Tool picker ─────────────────────────────────────────────────────────────
  const [tools, setTools] = useState<CourseTool[]>([])

  useEffect(() => {
    if (!isEducator) {
      router.replace(`/courses?course=${courseId}`)
      return
    }
    fetch(`/api/courses/${courseId}/tools`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CourseTool[]) => setTools(data))
      .catch(() => setTools([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isEducator])

  // Reset rubric when form changes that affect it
  useEffect(() => { setGeneratedRubric(null) }, [title, description, pointsPossible, toolId])

  async function handleGenerateRubric() {
    if (!title.trim()) {
      setRubricError('Add a title before generating a rubric.')
      return
    }
    setRubricError(null)
    setGeneratingRubric(true)
    setGeneratedRubric(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/rubrics/generate`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          assignmentTitle: title.trim(),
          assignmentDescription: description.trim() || undefined,
          pointsPossible: Number(pointsPossible) || 100,
          toolId: toolId || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Rubric generation failed')
      }
      setGeneratedRubric(await res.json())
    } catch (e) {
      setRubricError(e instanceof Error ? e.message : 'Rubric generation failed')
    } finally {
      setGeneratingRubric(false)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSaveError(null)
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        toolId: type === 'AI_EXPERIENCE' && toolId ? toolId : undefined,
        pointsPossible: Number(pointsPossible) || 100,
        dueAt: dueAt || null,
        isPublished,
      }
      if (generatedRubric) body.rubricId = generatedRubric.id

      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to create assignment')
      }
      router.push(`/courses/${courseId}/assignments`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to create assignment')
    } finally {
      setSaving(false)
    }
  }

  if (!isEducator) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="New Assignment"
        subtitle="Create an assignment for your course"
        action={
          <Link
            href={`/courses/${courseId}/assignments`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
            Back to Assignments
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* ── Left: form ── */}
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-5">
              <h2 className="font-extrabold text-gray-900">Assignment Details</h2>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 3 Research Analysis"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Instructions (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what students should do…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] resize-none"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['LEGACY_SUBMISSION', 'AI_EXPERIENCE'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm transition-colors ${
                        type === t
                          ? 'border-[#0033A0] bg-[#0033A0]/5 font-semibold text-[#0033A0]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t === 'AI_EXPERIENCE' ? (
                        <Bot className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                      {t === 'AI_EXPERIENCE' ? 'AI Experience' : 'Text / File Submission'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool picker — AI_EXPERIENCE only */}
              {type === 'AI_EXPERIENCE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Linked Tool *
                  </label>
                  <select
                    value={toolId}
                    onChange={(e) => setToolId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
                  >
                    <option value="">— Select a tool —</option>
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {tools.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No tools are linked to this course yet.
                    </p>
                  )}
                </div>
              )}

              {/* Points + Due date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Points Possible
                  </label>
                  <input
                    type="number"
                    value={pointsPossible}
                    onChange={(e) => setPointsPossible(e.target.value)}
                    min="1"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="size-3" />
                    Due Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0033A0] focus:outline-none"
                  />
                </div>
              </div>

              {/* Publish toggle */}
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <input
                  id="isPublished"
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="size-4 rounded border-gray-300 accent-[#0033A0]"
                />
                <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                  Publish immediately
                </label>
                <p className="ml-auto text-xs text-gray-400">
                  {isPublished ? 'Visible to students' : 'Saved as draft'}
                </p>
              </div>
            </div>

            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Link
                href={`/courses/${courseId}/assignments`}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving || !title.trim() || (type === 'AI_EXPERIENCE' && !toolId)}
                className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#002680] disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {isPublished ? 'Publish Assignment' : 'Save as Draft'}
              </button>
            </div>
          </div>

          {/* ── Right: AI rubric panel ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wand2 className="size-4 text-[#0033A0]" />
                <h2 className="font-extrabold text-gray-900">AI Rubric Generator</h2>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Generate a grading rubric from your assignment title, instructions, and any linked
                tool&apos;s learning objectives. The rubric will attach automatically when you save.
              </p>
              <button
                onClick={handleGenerateRubric}
                disabled={generatingRubric || !title.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002680] disabled:opacity-50 transition-colors"
              >
                {generatingRubric ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating rubric…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate AI Rubric
                  </>
                )}
              </button>
              {!title.trim() && (
                <p className="text-xs text-gray-400 text-center">Enter a title first</p>
              )}
              {rubricError && (
                <p className="text-xs text-red-600">{rubricError}</p>
              )}
            </div>

            {generatedRubric && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <p className="text-xs font-semibold text-green-700">
                    Rubric ready — will attach on save
                  </p>
                </div>
                <RubricPreview rubric={generatedRubric} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
