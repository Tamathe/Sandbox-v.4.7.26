'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, BookMarked, Plus } from 'lucide-react'
import NoteEditor, { type StudentNote } from './NoteEditor'

interface NotebookWidgetProps {
  userEmail: string
}

export default function NotebookWidget({ userEmail }: NotebookWidgetProps) {
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [loading, setLoading] = useState(true)
  const [editorNote, setEditorNote] = useState<StudentNote | null | undefined>(undefined) // undefined = closed, null = new

  useEffect(() => {
    fetch('/api/notes?limit=6', { headers: { 'x-demo-user-email': userEmail } })
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(data => setNotes(data.notes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userEmail])

  // Fix 13: listen for Sandy note-saved events and refresh the widget
  useEffect(() => {
    const handler = () => {
      fetch('/api/notes?limit=6', { headers: { 'x-demo-user-email': userEmail } })
        .then(r => r.ok ? r.json() : { notes: [] })
        .then(data => setNotes(data.notes ?? []))
        .catch(() => {})
    }
    window.addEventListener('sandbox-note-saved', handler)
    return () => window.removeEventListener('sandbox-note-saved', handler)
  }, [userEmail])

  const handleSaved = (saved: StudentNote) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === saved.id)
      return exists
        ? prev.map(n => n.id === saved.id ? saved : n)
        : [saved, ...prev].slice(0, 6)
    })
    setEditorNote(undefined)
  }

  const handleDeleted = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setEditorNote(undefined)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notebook</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditorNote(null)}
            className="flex items-center gap-1 text-xs text-[#0033A0] font-semibold hover:underline"
          >
            <Plus className="w-3 h-3" />
            New note
          </button>
          {notes.length > 0 && (
            <Link href="/notes" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
          <BookMarked className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-xs font-medium text-gray-500">No notes yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Ask Sandy to save something, or create one manually.</p>
          <button
            onClick={() => setEditorNote(null)}
            className="mt-3 text-xs text-[#0033A0] font-semibold hover:underline"
          >
            + Create a note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => setEditorNote(note)}
            />
          ))}
        </div>
      )}

      {editorNote !== undefined && (
        <NoteEditor
          note={editorNote}
          userEmail={userEmail}
          onClose={() => setEditorNote(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}

function NoteCard({ note, onClick }: { note: StudentNote; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-gray-200 p-3.5 hover:border-[#0033A0]/40 hover:shadow-sm transition-all group"
    >
      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#0033A0] transition-colors">
        {note.title}
      </p>
      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
        {note.content}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {note.course && (
          <span className="text-[10px] font-semibold bg-[#0033A0]/10 text-[#0033A0] px-1.5 py-0.5 rounded-full">
            {note.course.courseCode}
          </span>
        )}
        <span className="text-[10px] text-gray-400">
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
        {note.source === 'sandy' && (
          <span className="text-[10px] text-purple-400 font-medium">via Sandy</span>
        )}
      </div>
    </button>
  )
}
