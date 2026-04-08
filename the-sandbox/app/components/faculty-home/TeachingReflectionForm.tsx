'use client'

import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

const REFLECTION_TAGS = ['engagement', 'confusion', 'success', 'adjustment', 'student-highlight'] as const

export default function TeachingReflectionForm({
  courses,
  onClose,
}: {
  courses: { id: string; courseCode: string; title: string }[]
  onClose: () => void
}) {
  const { currentUser } = useAuth()
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleSave = async () => {
    if (!content.trim() || !courseId) return
    setSaving(true)
    try {
      await fetch('/api/faculty/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ courseId, content: content.trim(), tags }),
      })
      setSaved(true)
      setTimeout(() => onClose(), 1500)
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-700">Reflection saved</p>
      </div>
    )
  }

  const selectedCourse = courses.find(c => c.id === courseId)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-[#0033A0]" />
          <h2 className="text-sm font-extrabold text-gray-900">
            How did {selectedCourse?.courseCode ?? 'class'} go today?
          </h2>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3 px-5 py-4">
        {/* Course selector (if multiple) */}
        {courses.length > 1 && (
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
            ))}
          </select>
        )}

        {/* Text area */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Quick reflection — what worked, what didn't, what to adjust... (~30 seconds)"
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {REFLECTION_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tags.includes(tag)
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="rounded-lg bg-[#0033A0] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#002480] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
