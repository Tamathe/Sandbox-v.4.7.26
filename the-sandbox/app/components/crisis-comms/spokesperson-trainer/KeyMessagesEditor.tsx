'use client'

import { useState } from 'react'
import { Plus, X, MessageSquare } from 'lucide-react'

interface KeyMessagesEditorProps {
  keyMessages: string[]
  onChange: (messages: string[]) => void
  disabled?: boolean
}

export default function KeyMessagesEditor({ keyMessages, onChange, disabled }: KeyMessagesEditorProps) {
  const [draft, setDraft] = useState('')

  const addMessage = () => {
    const trimmed = draft.trim()
    if (!trimmed || keyMessages.length >= 3) return
    onChange([...keyMessages, trimmed])
    setDraft('')
  }

  const removeMessage = (index: number) => {
    onChange(keyMessages.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-semibold text-gray-900">Key Messages</h3>
        <span className="text-xs text-gray-400">{keyMessages.length}/3</span>
      </div>
      <p className="text-xs text-gray-500">
        Define 2-3 messages you want to land no matter what. Sandy will score you on delivery.
      </p>

      {keyMessages.map((msg, i) => (
        <div
          key={i}
          className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
        >
          <span className="text-xs font-bold text-[#0033A0] mt-0.5">{i + 1}</span>
          <span className="text-sm text-gray-800 flex-1">{msg}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => removeMessage(i)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}

      {keyMessages.length < 3 && !disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMessage()
              }
            }}
            placeholder={
              keyMessages.length === 0
                ? 'e.g., "Student safety is our top priority"'
                : 'Add another key message...'
            }
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          />
          <button
            type="button"
            onClick={addMessage}
            disabled={!draft.trim()}
            className="px-3 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-[#002680] transition-colors"
          >
            <Plus className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
