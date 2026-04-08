'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, Square, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import type { AgendaItem } from './AgendaEditor'

interface LiveNotesEditorProps {
  committeeId: string
  meetingId: string
  agenda: AgendaItem[]
  initialNotes?: string
  onEnd: (finalNotes: string) => void
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'

function formatElapsed(startTime: Date): string {
  const diff = Date.now() - startTime.getTime()
  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function LiveNotesEditor({
  committeeId,
  meetingId,
  agenda,
  initialNotes,
  onEnd,
}: LiveNotesEditorProps) {
  const { currentUser } = useAuth()
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [elapsed, setElapsed] = useState('0m')
  const [startTime] = useState(() => new Date())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedRef = useRef(initialNotes ?? '')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update elapsed timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(formatElapsed(startTime))
    }, 60000)
    // Set initial value
    setElapsed(formatElapsed(startTime))
    return () => clearInterval(timer)
  }, [startTime])

  // Auto-save every 30 seconds
  const saveNotes = useCallback(async (content: string) => {
    if (content === lastSavedRef.current) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/staff/committees/${committeeId}/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ rawNotes: content }),
      })
      if (res.ok) {
        lastSavedRef.current = content
        setSaveStatus('saved')
      } else {
        setSaveStatus('unsaved')
      }
    } catch {
      setSaveStatus('unsaved')
    }
  }, [committeeId, meetingId, currentUser.email])

  useEffect(() => {
    const interval = setInterval(() => {
      void saveNotes(notes)
    }, 30000)
    return () => clearInterval(interval)
  }, [notes, saveNotes])

  // Mark unsaved when notes change
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value)
    if (value !== lastSavedRef.current) {
      setSaveStatus('unsaved')
    }
    // Debounce clear any pending timeout
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }, [])

  // Insert text at cursor position
  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = notes.substring(0, start)
    const after = notes.substring(end)
    const newValue = before + text + after
    setNotes(newValue)
    setSaveStatus('unsaved')
    // Move cursor after inserted text
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + text.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }, [notes])

  const handleTimestamp = useCallback(() => {
    const now = new Date()
    const hh = now.getHours().toString().padStart(2, '0')
    const mm = now.getMinutes().toString().padStart(2, '0')
    insertAtCursor(`[${hh}:${mm}] `)
  }, [insertAtCursor])

  const handleAgendaItem = useCallback((item: AgendaItem) => {
    insertAtCursor(`\n## ${item.title}\n`)
  }, [insertAtCursor])

  const handleEnd = useCallback(async () => {
    // Final save before ending
    await saveNotes(notes)
    onEnd(notes)
  }, [notes, saveNotes, onEnd])

  // Determine which agenda section the cursor is in
  const [activeAgendaIndex, setActiveAgendaIndex] = useState<number | null>(null)
  const handleCursorMove = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const textBefore = notes.substring(0, textarea.selectionStart)
    const headers = textBefore.match(/^## .+$/gm) ?? []
    if (headers.length === 0) {
      setActiveAgendaIndex(null)
      return
    }
    const lastHeader = headers[headers.length - 1].replace('## ', '')
    const idx = agenda.findIndex(a => a.title === lastHeader)
    setActiveAgendaIndex(idx >= 0 ? idx : null)
  }, [notes, agenda])

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTimestamp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Clock className="size-3.5" />
            Timestamp
          </button>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-mono font-semibold">{elapsed}</span>
            <span>elapsed</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-green-600">
                <Check className="size-3" /> Saved
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-amber-600">Unsaved changes</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleEnd()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          <Square className="size-3.5" />
          End Meeting
        </button>
      </div>

      {/* Main content: textarea + agenda sidebar */}
      <div className="flex">
        {/* Textarea */}
        <div className="flex-1 p-4">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            placeholder="Start taking notes... Use the Timestamp button to mark times, or click agenda items on the right to insert section headers."
            className="w-full min-h-[400px] font-mono text-sm text-gray-900 border-0 bg-transparent focus:outline-none focus:ring-0 resize-y placeholder:text-gray-300"
          />
        </div>

        {/* Agenda sidebar */}
        {agenda.length > 0 && (
          <div className="hidden sm:block w-52 shrink-0 border-l border-gray-100 p-3 overflow-y-auto max-h-[500px]">
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Agenda Items</h4>
            <div className="space-y-1">
              {agenda.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAgendaItem(item)}
                  className={`w-full text-left px-2.5 py-2 text-xs rounded-lg transition-colors ${
                    activeAgendaIndex === i
                      ? 'bg-[#0033A0]/10 text-[#0033A0] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-gray-400 mr-1">{i + 1}.</span>
                  {item.title || '(untitled)'}
                  {item.timeMinutes ? (
                    <span className="text-gray-400 ml-1">({item.timeMinutes}m)</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
