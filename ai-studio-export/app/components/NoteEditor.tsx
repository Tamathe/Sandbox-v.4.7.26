'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Save, Trash2, X } from 'lucide-react'

interface Course {
  id: string
  courseCode: string
  title: string
}

export interface StudentNote {
  id: string
  title: string
  content: string
  source: string
  createdAt: string
  updatedAt: string
  courseId: string | null
  course: Course | null
}

interface NoteEditorProps {
  note: StudentNote | null        // null = new note
  userEmail: string
  onClose: () => void
  onSaved: (note: StudentNote) => void
  onDeleted?: (id: string) => void
}

export default function NoteEditor({ note, userEmail, onClose, onSaved, onDeleted }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [courseId, setCourseId] = useState<string>(note?.courseId ?? '')
  const [courses, setCourses] = useState<Course[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const isDirty =
    title !== (note?.title ?? '') ||
    content !== (note?.content ?? '') ||
    courseId !== (note?.courseId ?? '')

  // Fix 14: Fetch enrolled courses only (not all public courses)
  useEffect(() => {
    fetch('/api/enrollment', { headers: { 'x-demo-user-email': userEmail } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // /api/enrollment returns { courses: [{ courseId, courseCode, title, ... }] }
        const list: Course[] = (data?.courses ?? []).map((c: { courseId: string; courseCode: string; title: string }) => ({
          id: c.courseId,
          courseCode: c.courseCode,
          title: c.title,
        }))
        setCourses(list)
      })
      .catch(() => { setCourses([]) })
  }, [userEmail])

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!content.trim()) { setError('Note body is required'); return }
    setError('')
    setSaving(true)
    try {
      const url = note ? `/api/notes/${note.id}` : '/api/notes'
      const method = note ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), courseId: courseId || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }
      const saved: StudentNote = await res.json()
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!note) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) throw new Error('Delete failed')
      onDeleted?.(note.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{note ? 'Edit Note' : 'New Note'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title..."
              maxLength={200}
              className="w-full text-base font-semibold text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
            />
          </div>

          {/* Course selector */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Course (optional)</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] bg-white"
            >
              <option value="">No course — general note</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.courseCode} · {c.title}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Note</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your note here..."
              rows={10}
              className="w-full text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none leading-relaxed font-mono"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div>
            {note && onDeleted && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  confirmDelete ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-500'
                }`}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white rounded-xl text-sm font-medium hover:bg-[#002580] transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
