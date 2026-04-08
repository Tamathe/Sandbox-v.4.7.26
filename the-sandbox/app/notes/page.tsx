'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { BookMarked, Plus, Search } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import NoteEditor, { type StudentNote } from '../components/NoteEditor'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'

import type { Course } from '../components/courses/course-types'

export default function NotesPage() {
  const { currentUser } = useAuth()
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [filterCourseId, setFilterCourseId] = useState('')
  const [search, setSearch] = useState('')
  const [editorNote, setEditorNote] = useState<StudentNote | null | undefined>(undefined)

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterCourseId) params.set('courseId', filterCourseId)
    params.set('limit', '100')

    setLoading(true)
    fetch(`/api/notes?${params}`, { headers: { 'x-demo-user-email': currentUser.email } })
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(data => setNotes(data.notes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterCourseId, currentUser.email])

  useEffect(() => {
    fetch('/api/courses', { headers: { 'x-demo-user-email': currentUser.email } })
      .then(r => r.ok ? r.json() : null)
      .then(data => setCourses(data?.courses ?? data ?? []))
      .catch(() => {})
  }, [currentUser.email])

  const filtered = notes.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  const handleSaved = (saved: StudentNote) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === saved.id)
      return exists
        ? prev.map(n => n.id === saved.id ? saved : n)
        : [saved, ...prev]
    })
    setEditorNote(undefined)
  }

  const handleDeleted = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setEditorNote(undefined)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="My Notebook"
        subtitle={`${notes.length} note${notes.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => setEditorNote(null)} icon={<Plus />}>
            New note
          </Button>
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
            />
          </div>
          <select
            value={filterCourseId}
            onChange={e => setFilterCourseId(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] text-gray-700"
          >
            <option value="">All courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.courseCode} · {c.title}</option>
            ))}
          </select>
        </div>

        {/* Notes list */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border-2 border-gray-200 bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookMarked className="mx-auto mb-3 size-10 text-gray-200" />
            <p className="text-gray-500 font-medium">
              {search || filterCourseId ? 'No notes match your filters' : 'Your notes will appear here'}
            </p>
            {!search && !filterCourseId && (
              <p className="text-sm text-gray-400 mt-1">
                Notes you take during sessions or create manually will show up here.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(note => (
              <button
                key={note.id}
                onClick={() => setEditorNote(note)}
                className="w-full text-left bg-white rounded-2xl border-2 border-gray-200 px-5 py-4 hover:border-[#0033A0]/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-[#0033A0] transition-colors">
                      {note.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {note.course && (
                        <span className="text-[10px] font-semibold bg-[#0033A0]/10 text-[#0033A0] px-2 py-0.5 rounded-full">
                          {note.course.courseCode}
                        </span>
                      )}
                      {note.source === 'sandy' && (
                        <span className="text-[10px] text-purple-400 font-medium">via Sandy</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {editorNote !== undefined && (
        <NoteEditor
          note={editorNote}
          userEmail={currentUser.email}
          onClose={() => setEditorNote(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
