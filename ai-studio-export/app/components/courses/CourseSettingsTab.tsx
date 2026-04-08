'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import type { Course } from './course-types'
import { courseHeaders, readJson } from './course-utils'

interface CourseSettingsTabProps {
  courseId: string
  course: Course
  canManage: boolean
  userEmail: string
  onCourseUpdate: (updated: Course) => void
  onCourseDeleted: () => void
}

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
  })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
        }),
      })
      onCourseUpdate(updated)
      setNotice('Course settings saved.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
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
      {/* Settings form */}
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
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
                  { value: true, label: 'Public', description: 'Visible to students across the platform.' },
                  { value: false, label: 'Private', description: 'Only the course owner and admins can access it.' },
                ].map(({ value, label, description }) => (
                  <label key={String(value)} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={form.isPublic === value}
                      onChange={() => setForm((p) => ({ ...p, isPublic: value }))}
                      className="mt-1 h-4 w-4 border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
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
              <CheckCircle className="h-4 w-4" />
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
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>

      {/* Danger zone */}
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
              <span className="text-sm font-medium text-red-700">This is irreversible. Are you sure?</span>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
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
