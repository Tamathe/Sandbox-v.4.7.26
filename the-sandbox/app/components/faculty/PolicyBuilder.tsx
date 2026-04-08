'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'

import TrustPanel from '../TrustPanel'
import { useAuth } from '../../lib/auth-context'
import type {
  PolicyBuilderCourseContext,
  PolicyBuilderDraft,
  PolicyBuilderGenerateResponse,
  PolicyBuilderPolicyType,
  PolicyBuilderPreflightResponse,
  PolicyBuilderSaveMode,
} from '../../lib/faculty/policy-builder-types'
import { courseHeaders, readJson } from '../courses/course-utils'

const POLICY_TYPE_LABELS: Record<PolicyBuilderPolicyType, string> = {
  late: 'Late / make-up work',
  attendance: 'Attendance / participation',
  grading: 'Graded work expectations',
  academic_integrity: 'AI use and academic integrity',
  communication: 'Communication and disclosure',
  other: 'Other syllabus section',
}

const STANCE_OPTIONS = [
  {
    value: 'prohibited',
    label: 'Prohibited by default',
    description: 'Best when faculty want explicit permission before any graded AI use.',
  },
  {
    value: 'limited',
    label: 'Limited support only',
    description: 'Allows brainstorming/editing help but blocks substantive generated work.',
  },
  {
    value: 'disclosed',
    label: 'Allowed with disclosure',
    description: 'Permits AI use when students name the tool and verify the output.',
  },
  {
    value: 'encouraged',
    label: 'Encouraged with accountability',
    description: 'Useful when the course wants transparent AI-supported process work.',
  },
] as const

const TONE_OPTIONS = [
  {
    value: 'firm',
    label: 'Firm',
  },
  {
    value: 'balanced',
    label: 'Balanced',
  },
  {
    value: 'supportive',
    label: 'Supportive',
  },
] as const

function formatWeight(weight: number) {
  return `${Math.round(weight * 100)}%`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0] hover:text-[#0033A0]'
      }`}
    >
      {copied ? <CheckCircle className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function FlagPill({
  enabled,
  label,
}: {
  enabled: boolean
  label: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        enabled
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {label}: {enabled ? 'On' : 'Off'}
    </span>
  )
}

function EmptyDraft() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
      <Sparkles className="mb-3 size-10 text-gray-300" />
      <h3 className="text-lg font-extrabold text-gray-900">Generate a syllabus-ready AI policy draft</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Pick a course, set the stance you want, and the builder will generate editable language grounded in your current course policies and governance settings.
      </p>
    </div>
  )
}

export default function PolicyBuilder() {
  const { currentUser } = useAuth()
  const searchParams = useSearchParams()
  const initialCourseId = searchParams.get('courseId')

  const [courses, setCourses] = useState<PolicyBuilderPreflightResponse['courses']>([])
  const [context, setContext] = useState<PolicyBuilderCourseContext | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId ?? '')
  const [policyType, setPolicyType] = useState<PolicyBuilderPolicyType>('academic_integrity')
  const [stance, setStance] = useState<(typeof STANCE_OPTIONS)[number]['value']>('limited')
  const [tone, setTone] = useState<(typeof TONE_OPTIONS)[number]['value']>('balanced')
  const [titleOverride, setTitleOverride] = useState('')
  const [allowedUses, setAllowedUses] = useState('')
  const [restrictedUses, setRestrictedUses] = useState('')
  const [disclosureRequirements, setDisclosureRequirements] = useState('')
  const [courseNotes, setCourseNotes] = useState('')
  const [draft, setDraft] = useState<PolicyBuilderDraft | null>(null)
  const [editableTitle, setEditableTitle] = useState('')
  const [editableContent, setEditableContent] = useState('')
  const [saveMode, setSaveMode] = useState<PolicyBuilderSaveMode>('append')
  const [replacePolicyId, setReplacePolicyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const activeDraftPolicyType = draft?.policyType ?? policyType

  const loadPreflight = useCallback(
    async (courseId?: string | null) => {
      setLoading(true)
      setError(null)
      try {
        const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
        const data = await readJson<PolicyBuilderPreflightResponse>(
          `/api/write-room/ai-policy-builder/preflight${query}`,
          {
            headers: courseHeaders(currentUser.email),
          },
        )
        setCourses(data.courses)
        setContext(data.context)
        setSelectedCourseId((current) => data.selectedCourseId ?? current)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policy builder context')
      } finally {
        setLoading(false)
      }
    },
    [currentUser.email],
  )

  useEffect(() => {
    void loadPreflight(initialCourseId)
  }, [initialCourseId, loadPreflight])

  const replaceCandidates = useMemo(
    () =>
      draft?.saveCandidates ??
      context?.existingPolicies.filter((policy) => policy.policyType === activeDraftPolicyType) ??
      [],
    [activeDraftPolicyType, context?.existingPolicies, draft?.saveCandidates],
  )

  useEffect(() => {
    if (replaceCandidates.length > 0) {
      setSaveMode('replace')
      setReplacePolicyId((current) => current ?? replaceCandidates[0].id)
      return
    }

    setSaveMode('append')
    setReplacePolicyId(null)
  }, [replaceCandidates])

  async function handleCourseChange(nextCourseId: string) {
    setSelectedCourseId(nextCourseId)
    setDraft(null)
    setEditableTitle('')
    setEditableContent('')
    setNotice(null)
    setError(null)
    await loadPreflight(nextCourseId)
  }

  async function handleGenerate() {
    if (!selectedCourseId) return

    setGenerating(true)
    setNotice(null)
    setError(null)

    try {
      const response = await readJson<PolicyBuilderGenerateResponse>(
        '/api/write-room/ai-policy-builder/generate',
        {
          method: 'POST',
          headers: courseHeaders(currentUser.email, true),
          body: JSON.stringify({
            courseId: selectedCourseId,
            policyType,
            stance,
            tone,
            title: titleOverride || null,
            allowedUses: allowedUses || null,
            restrictedUses: restrictedUses || null,
            disclosureRequirements: disclosureRequirements || null,
            courseNotes: courseNotes || null,
          }),
        },
      )

      setContext(response.context)
      setDraft(response.draft)
      setEditableTitle(response.draft.title)
      setEditableContent(response.draft.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate policy language')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!selectedCourseId || !editableTitle.trim() || !editableContent.trim()) return

    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const response = await readJson<{
        changeRecorded: boolean
        acknowledgmentReset: boolean
      }>(
        '/api/write-room/ai-policy-builder/save',
        {
          method: 'POST',
          headers: courseHeaders(currentUser.email, true),
          body: JSON.stringify({
            courseId: selectedCourseId,
            saveMode,
            replacePolicyId: saveMode === 'replace' ? replacePolicyId : null,
            policy: {
              title: editableTitle.trim(),
              policyType: activeDraftPolicyType,
              content: editableContent.trim(),
            },
          }),
        },
      )

      setNotice(
        response.changeRecorded
          ? response.acknowledgmentReset
            ? 'Policy applied. Existing acknowledgments were reset so students can re-acknowledge the updated language.'
            : 'Policy applied.'
          : 'That policy was already saved with the same language.',
      )
      await loadPreflight(selectedCourseId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the policy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f3ea]">
      <div className="border-b border-[#d9d2c3] bg-[#fdfbf5]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/write-room"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-[#0033A0]"
          >
            <ArrowLeft className="size-4" />
            Write Room
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#0f5f45]/10 text-[#0f5f45]">
              <Wand2 className="size-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5f45]">
                <ShieldCheck className="size-3.5" />
                Faculty Launch Pack
              </div>
              <h1 className="mt-2 text-2xl font-extrabold text-gray-900">AI Policy Builder</h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Draft editable syllabus language grounded in your existing course policies, grading setup, and governance settings before you publish anything deeper.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-[#d9d2c3] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#0f5f45]" />
                <h2 className="text-sm font-semibold text-gray-900">Policy setup</h2>
              </div>

              {loading ? (
                <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading course context...
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Course
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(event) => void handleCourseChange(event.target.value)}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    >
                      {courses.length === 0 && <option value="">No faculty courses found</option>}
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.courseCode} - {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Save under syllabus section
                    </label>
                    <select
                      value={policyType}
                      onChange={(event) => setPolicyType(event.target.value as PolicyBuilderPolicyType)}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    >
                      {Object.entries(POLICY_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Student AI stance
                      </label>
                      <select
                        value={stance}
                        onChange={(event) => setStance(event.target.value as (typeof STANCE_OPTIONS)[number]['value'])}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                      >
                        {STANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {STANCE_OPTIONS.find((option) => option.value === stance)?.description}
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Tone
                      </label>
                      <select
                        value={tone}
                        onChange={(event) => setTone(event.target.value as (typeof TONE_OPTIONS)[number]['value'])}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                      >
                        {TONE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Title override
                    </label>
                    <input
                      value={titleOverride}
                      onChange={(event) => setTitleOverride(event.target.value)}
                      placeholder="Optional custom section title"
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Allowed uses
                    </label>
                    <textarea
                      value={allowedUses}
                      onChange={(event) => setAllowedUses(event.target.value)}
                      rows={3}
                      placeholder="Optional. Example: brainstorming, outlines, revision checks, study guides..."
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Restricted uses
                    </label>
                    <textarea
                      value={restrictedUses}
                      onChange={(event) => setRestrictedUses(event.target.value)}
                      rows={3}
                      placeholder="Optional. Example: final drafts, solution generation, fabricated citations, hidden AI use..."
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Disclosure requirement
                    </label>
                    <textarea
                      value={disclosureRequirements}
                      onChange={(event) => setDisclosureRequirements(event.target.value)}
                      rows={3}
                      placeholder="Optional. Example: add a short process note naming the tool and what it helped with..."
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Course-specific notes
                    </label>
                    <textarea
                      value={courseNotes}
                      onChange={(event) => setCourseNotes(event.target.value)}
                      rows={3}
                      placeholder="Optional. Example: capstone reports must document revision history; no AI on oral exams..."
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={!selectedCourseId || generating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f5f45] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0c4e3a] disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                    Generate syllabus language
                  </button>
                </div>
              )}
            </div>
 
            {context && (
              <>
                <div className="rounded-3xl border border-[#d9d2c3] bg-[#fffdf8] p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Governance snapshot</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {context.course.courseCode} - {context.course.title}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {context.sourceSummary.allowedSources} allowed / {context.sourceSummary.totalSources} tracked sources
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <FlagPill
                      enabled={context.course.flags.facultyAiRetrievalApproved}
                      label="Faculty retrieval"
                    />
                    <FlagPill
                      enabled={context.course.flags.studentUploadsAllowed}
                      label="Student uploads"
                    />
                    <FlagPill
                      enabled={context.course.flags.transcriptGenerationAllowed}
                      label="Transcript generation"
                    />
                    <FlagPill
                      enabled={context.course.flags.classroomRecordingAllowed}
                      label="Recording"
                    />
                  </div>

                  {context.recommendedTemplate && (
                    <div className="mt-4 rounded-2xl border border-[#d9d2c3] bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Suggested starting pattern
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {context.recommendedTemplate.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {context.recommendedTemplate.description}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-[#d9d2c3] bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900">Grounding from this course</h2>

                  {context.existingPolicies.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {context.existingPolicies.slice(0, 4).map((policy) => (
                        <div key={policy.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{policy.title}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              {POLICY_TYPE_LABELS[policy.policyType]}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-sm text-gray-600">{policy.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                      No existing syllabus policies are stored for this course yet.
                    </div>
                  )}

                  {context.existingWeights.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-[#fbfaf6] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Grading weights
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {context.existingWeights.map((weight) => (
                          <span
                            key={weight.id}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {weight.category} {formatWeight(weight.weight)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {context.relevantContextText && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-[#fbfaf6] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Policy context excerpt
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                        {context.relevantContextText}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-6 lg:col-span-7">
            {draft ? (
              <div className="rounded-3xl border border-[#d9d2c3] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#0f5f45]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f5f45]">
                      <Sparkles className="size-3.5" />
                      {draft.generationMethod === 'anthropic+template+governance'
                        ? 'AI polished from course context'
                        : 'Course-grounded policy composer'}
                    </div>
                    <h2 className="mt-3 text-lg font-extrabold text-gray-900">Editable syllabus language</h2>
                  </div>
                  <CopyButton text={`${editableTitle}\n\n${editableContent}`} />
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Policy title
                    </label>
                    <input
                      value={editableTitle}
                      onChange={(event) => setEditableTitle(event.target.value)}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Syllabus language
                    </label>
                    <textarea
                      value={editableContent}
                      onChange={(event) => setEditableContent(event.target.value)}
                      rows={16}
                      className="w-full rounded-3xl border border-gray-300 px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                    />
                  </div>

                  <div className="rounded-2xl border border-[#d9d2c3] bg-[#fffdf8] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Save behavior
                    </div>

                    <div className="mt-3 space-y-3">
                      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                        <input
                          type="radio"
                          checked={saveMode === 'replace'}
                          onChange={() => setSaveMode('replace')}
                          disabled={replaceCandidates.length === 0}
                          className="mt-1 size-4 border-gray-300 text-[#0f5f45] focus:ring-[#0f5f45]"
                        />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Replace an existing policy</div>
                          <div className="mt-1 text-sm text-gray-500">
                            Safer when you already have a policy in this syllabus section and want to avoid duplicate language.
                          </div>
                        </div>
                      </label>

                      {saveMode === 'replace' && replaceCandidates.length > 0 && (
                        <select
                          value={replacePolicyId ?? ''}
                          onChange={(event) => setReplacePolicyId(event.target.value)}
                          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-[#0f5f45]"
                        >
                          {replaceCandidates.map((policy) => (
                            <option key={policy.id} value={policy.id}>
                              {policy.title}
                            </option>
                          ))}
                        </select>
                      )}

                      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                        <input
                          type="radio"
                          checked={saveMode === 'append'}
                          onChange={() => setSaveMode('append')}
                          className="mt-1 size-4 border-gray-300 text-[#0f5f45] focus:ring-[#0f5f45]"
                        />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">Add as a new course policy</div>
                          <div className="mt-1 text-sm text-gray-500">
                            Keeps existing language untouched and adds this draft as a separate stored policy.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving || !editableTitle.trim() || !editableContent.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0f5f45] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0c4e3a] disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Apply to course policies
                    </button>
                    <p className="text-sm text-gray-500">
                      Saves through an inspectable API flow and reuses the existing policy change history.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyDraft />
            )}

            {draft && (
              <>
                <div className="rounded-3xl border border-[#d9d2c3] bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900">Why this draft fits the course</h2>
                  <div className="mt-4 space-y-2">
                    {draft.rationale.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#d9d2c3] bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900">Trust and provenance</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the governed course sources and permissions that informed this policy draft.
                  </p>
                  <div className="mt-4">
                    <TrustPanel data={draft.trustPanel} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
