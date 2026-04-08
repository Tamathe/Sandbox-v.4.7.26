'use client'

import { useState, useRef, useEffect } from 'react'
import { Save, Loader2, Check, X } from 'lucide-react'

interface Props {
  messages: Array<{ role: string; content: string }>
  sessionId: string | null
  onSaved: (session: { id: string; title: string; updatedAt: string }) => void
  userEmail: string
}

export default function SaveSessionButton({ messages, sessionId, onSaved, userEmail }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const exportable = messages.filter(m => m.role === 'user' || m.role === 'assistant')

  // Auto-suggest title from first user message
  useEffect(() => {
    if (isOpen && !title) {
      const firstUser = messages.find(m => m.role === 'user')
      if (firstUser) {
        const suggested = firstUser.content.slice(0, 60).trim()
        setTitle(suggested + (firstUser.content.length > 60 ? '...' : ''))
      }
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [isOpen, title, messages])

  async function handleSave() {
    if (!title.trim() || isSaving) return
    setIsSaving(true)

    try {
      const res = await fetch('/api/workshop/research-hub/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          id: sessionId ?? undefined,
          title: title.trim(),
          messages: exportable.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      onSaved(data.session)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setIsOpen(false)
      }, 1200)
    } catch {
      // silent fail — user can retry
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = exportable.length > 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!canSave) return
          setIsOpen(!isOpen)
        }}
        disabled={!canSave}
        title={canSave ? 'Save session' : 'Send a message first'}
        className="flex-shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Save className="size-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">
              {sessionId ? 'Update Session' : 'Save Session'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            placeholder="Session title..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] mb-2"
          />
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002580] transition-colors disabled:opacity-50"
          >
            {saved ? (
              <>
                <Check className="size-4" />
                Saved
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                {sessionId ? 'Update' : 'Save'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
