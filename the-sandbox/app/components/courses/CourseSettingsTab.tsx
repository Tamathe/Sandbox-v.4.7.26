'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import type { Course } from './course-types'
import { courseHeaders, readJson } from './course-utils'
import type { CourseGovernanceApiResponse } from '../../lib/provenance-types'

interface CourseSettingsTabProps {
  courseId: string
  course: Course
  canManage: boolean
  userEmail: string
  onCourseUpdate: (updated: Course) => void
  onCourseDeleted: () => void
}

const GOVERNANCE_FIELDS = [
  {
    key: 'facultyAiRetrievalApproved',
    label: 'Faculty approved for AI retrieval',
    description:
      'Allows Sandy to retrieve official course materials and policies for course-specific replies.',
  },
  {
    key: 'studentUploadsAllowed',
    label: 'Student upload reuse allowed',
    description:
      'Allows student-uploaded course content to participate in AI retrieval when consent is current.',
  },
  {
    key: 'transcriptGenerationAllowed',
    label: 'Transcript generation allowed',
    description:
      'Marks this course as approved for transcript-style captures and downstream AI use.',
  },
  {
    key: 'classroomRecordingAllowed',
    label: 'Classroom recording allowed',
    description: 'Marks classroom recording as approved for this course context.',
  },
] as const

export default function CourseSettingsTab({
  courseId,
  course,
  canManage,
  userEmail,
  onCourseUpdate,
  onCourseDeleted,
}: CourseSettingsTabProps) {
  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? '',
    isPublic: course.isPublic,
    canvasCourseId: course.canvasCourseId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [canvasTestStatus, setCanvasTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [canvasTestMsg, setCanvasTestMsg] = useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [governance, setGovernance] = useState<CourseGovernanceApiResponse | null>(null)
  const [governanceForm, setGovernanceForm] = useState({
    facultyAiRetrievalApproved: true,
    studentUploadsAllowed: false,
    transcriptGenerationAllowed: false,
    classroomRecordingAllowed: false,
  })
  const [governanceLoading, setGovernanceLoading] = useState(canManage)
  const [governanceSaving, setGovernanceSaving] = useState(false)
  const [governanceError, setGovernanceError] = useState<string | null>(null)
  const [governanceNotice, setGovernanceNotice] = useState<string | null>(null)

  async function loadGovernance() {
    if (!canManage) return

    setGovernanceLoading(true)
    setGovernanceError(null)
    try {
      const data = await readJson<CourseGovernanceApiResponse>(
        `/api/courses/${courseId}/content-governance`,
        {
          headers: courseHeaders(userEmail),
        },
      )
      setGovernance(data)
      setGovernanceForm(data.course.flags)
    } catch (err) {
      setGovernanceError(
        err instanceof Error ? err.message : 'Failed to load governance settings',
      )
    } finally {
      setGovernanceLoading(false)
    }
  }

  useEffect(() => {
    void loadGovernance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, courseId, userEmail])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      const updated = await readJson<Course>(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          isPublic: form.isPublic,
          canvasCourseId: form.canvasCourseId.trim() || null,
        }),
      })
      onCourseUpdate(updated)
      setNotice('Course settings saved.')
      void loadGovernance()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleGovernanceSave() {
    setGovernanceSaving(true)
    setGovernanceError(null)
    setGovernanceNotice(null)
    try {
      const updated = await readJson<CourseGovernanceApiResponse>(
        `/api/courses/${courseId}/content-governance`,
        {
          method: 'PATCH',
          headers: courseHeaders(userEmail, true),
          body: JSON.stringify(governanceForm),
        },
      )
      setGovernance(updated)
      setGovernanceForm(updated.course.flags)
      setGovernanceNotice('Governance settings saved.')
    } catch (err) {
      setGovernanceError(
        err instanceof Error ? err.message : 'Failed to save governance settings',
      )
    } finally {
      setGovernanceSaving(false)
    }
  }

  async function handleCanvasTest() {
    setCanvasTestStatus('testing')
    setCanvasTestMsg(null)
    try {
      const res = await fetch('/api/canvas/test', {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ canvasCourseId: form.canvasCourseId.trim() }),
      })
      const data = (await res.json()) as { ok: boolean; message: string }
      setCanvasTestStatus(data.ok ? 'ok' : 'error')
      setCanvasTestMsg(data.message)
    } catch {
      setCanvasTestStatus('error')
      setCanvasTestMsg('Could not reach Canvas - check your credentials.')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await readJson(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: courseHeaders(userEmail),
      })
      onCourseDeleted()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete course')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Course Code
              </label>
              <input
                value={course.courseCode}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Title
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Visibility
              </div>
              <div className="space-y-3">
                {[
                  {
                    value: true,
                    label: 'Public',
                    description: 'Visible to students across the platform.',
                  },
                  {
                    value: false,
                    label: 'Private',
                    description: 'Only the course owner, admins, and course members can access it.',
                  },
                ].map(({ value, label, description }) => (
                  <label
                    key={String(value)}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={form.isPublic === value}
                      onChange={() => setForm((prev) => ({ ...prev, isPublic: value }))}
                      className="mt-1 size-4 border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{label}</div>
                      <div className="text-sm text-gray-500">{description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {notice ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle className="size-4" />
              {notice}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Changes update this course immediately.</div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>

      {canManage && (
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Canvas LMS Integration</h4>
            <p className="mt-0.5 text-xs text-gray-500">
              Link this course to Canvas to enable automatic grade push when you release grades.
              Requires <code className="rounded bg-gray-200 px-1 py-0.5 text-[11px]">CANVAS_BASE_URL</code>{' '}
              and <code className="rounded bg-gray-200 px-1 py-0.5 text-[11px]">CANVAS_API_TOKEN</code>{' '}
              in your environment.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Canvas Course ID
            </label>
            <div className="flex gap-2">
              <input
                value={form.canvasCourseId}
                onChange={(e) => setForm((prev) => ({ ...prev, canvasCourseId: e.target.value }))}
                placeholder="e.g. 12345"
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
              />
              <button
                type="button"
                onClick={handleCanvasTest}
                disabled={canvasTestStatus === 'testing' || !form.canvasCourseId.trim()}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {canvasTestStatus === 'testing' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Test
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Find this in Canvas: Courses -&gt; Settings -&gt; look at the URL
              (e.g. /courses/<strong>12345</strong>/settings)
            </p>
          </div>
          {canvasTestMsg && (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                canvasTestStatus === 'ok'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {canvasTestStatus === 'ok' ? (
                <CheckCircle className="size-4 shrink-0" />
              ) : (
                <ExternalLink className="size-4 shrink-0" />
              )}
              {canvasTestMsg}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0033A0]">
              <ShieldCheck className="size-3.5" />
              Governance and provenance
            </div>
            <h4 className="mt-3 text-sm font-semibold text-gray-800">Trust controls for course retrieval</h4>
            <p className="mt-1 text-sm text-gray-500">
              Decide what Sandy is allowed to retrieve from this course and review the current provenance mix.
            </p>
          </div>

          {governanceError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {governanceError}
            </div>
          )}

          {governanceLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" />
              Loading governance settings...
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {GOVERNANCE_FIELDS.map((field) => (
                  <label key={field.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={governanceForm[field.key]}
                        onChange={(e) =>
                          setGovernanceForm((prev) => ({
                            ...prev,
                            [field.key]: e.target.checked,
                          }))
                        }
                        className="mt-1 size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{field.label}</div>
                        <div className="mt-1 text-sm text-gray-500">{field.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {governance && (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Sources
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {governance.sourceSummary.totalSources}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {governance.sourceSummary.officialSources} official |{' '}
                        {governance.sourceSummary.userUploadedSources} user-uploaded
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Retrieval status
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {governance.sourceSummary.allowedSources}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {governance.sourceSummary.blockedSources} blocked by current governance
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Policies
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {governance.policySummary.totalPolicies}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {governance.policySummary.totalWeights} grading weights |{' '}
                        {governance.policySummary.ackCount} acknowledgements
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Consent snapshot
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {governance.consent?.latestConsentVersion ?? 'No active consent version'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {governance.policySummary.latestChangeAt
                          ? `Latest policy change ${new Date(governance.policySummary.latestChangeAt).toLocaleDateString()}`
                          : 'No recorded policy changes yet'}
                      </div>
                    </div>
                  </div>

                  {governance.recentSources.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Recent source trust
                      </div>
                      <div className="space-y-2">
                        {governance.recentSources.slice(0, 4).map((source) => (
                          <div
                            key={`${source.kind}-${source.id}`}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-gray-800">
                                {source.title}
                              </div>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                {source.provenanceType}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  source.allowed
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {source.allowed ? 'Allowed' : 'Restricted'}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                              {source.sourceSystemLabel} | {source.approvalBasisLabel}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              Last updated{' '}
                              {source.lastUpdatedAt
                                ? new Date(source.lastUpdatedAt).toLocaleString()
                                : 'Unknown'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {governanceNotice ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    <CheckCircle className="size-4" />
                    {governanceNotice}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Sandy&apos;s trust panel uses these settings plus source-level provenance metadata.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void handleGovernanceSave()}
                  disabled={governanceSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                >
                  {governanceSaving && <Loader2 className="size-4 animate-spin" />}
                  Save governance
                </button>
              </div>

              <div className="rounded-2xl border border-[#cfe6dd] bg-[#f4fbf7] px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f5f45]">
                      <Sparkles className="size-3.5" />
                      Faculty launch pack
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      Need syllabus-ready AI language?
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Open the AI Policy Builder to draft editable syllabus language using this course&apos;s current governance and policy context.
                    </div>
                  </div>

                  <Link
                    href={`/write-room/ai-policy-builder?courseId=${courseId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f5f45] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0c4e3a]"
                  >
                    <Sparkles className="size-4" />
                    Open policy builder
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {canManage && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <h4 className="mb-1 text-sm font-semibold text-red-700">Danger Zone</h4>
          <p className="mb-4 text-sm text-red-600">
            Deleting this course removes all materials and tool links permanently. This cannot be undone.
          </p>
          {deleteError && (
            <div className="mb-3 rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-800">
              {deleteError}
            </div>
          )}
          {deleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-red-700">
                This is irreversible. Are you sure?
              </span>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                Yes, delete course
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Delete this course
            </button>
          )}
        </div>
      )}
    </div>
  )
}
