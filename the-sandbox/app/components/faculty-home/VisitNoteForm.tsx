'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface VisitNoteFormProps {
  studentId: string
  studentName: string
  courses: Array<{ id: string; courseCode: string }>
  onSaved: () => void
  onCancel: () => void
}

export default function VisitNoteForm({
  studentId,
  studentName,
  courses,
  onSaved,
  onCancel,
}: VisitNoteFormProps) {
  const { currentUser } = useAuth()
  const [content, setContent] = useState('')
  const [courseId, setCourseId] = useState(courses.length === 1 ? courses[0].id : '')
  const [followUpDate, setFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/faculty/visit-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          studentId,
          courseId: courseId || undefined,
          content: content.trim(),
          followUpDate: followUpDate || undefined,
        }),
      })

      if (response.ok) {
        onSaved()
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#0033A0]/20 bg-[#0033A0]/5 p-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">
          Note for <span className="text-[#0033A0]">{studentName}</span>
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Course selector (only if multiple courses) */}
      {courses.length > 1 && (
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
        >
          <option value="">Select course (optional)</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseCode}
            </option>
          ))}
        </select>
      )}

      {/* Note content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What did you discuss?"
        rows={3}
        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
      />

      {/* Follow-up date */}
      <div className="flex items-center gap-2">
        <label htmlFor="followup-date" className="text-xs text-gray-500 whitespace-nowrap">
          Follow up by:
        </label>
        <input
          id="followup-date"
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
        />
      </div>

      {/* Save button */}
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#0033A0] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#002480] disabled:opacity-50"
      >
        <Save className="size-3" />
        {saving ? 'Saving...' : 'Save note'}
      </button>
    </form>
  )
}
