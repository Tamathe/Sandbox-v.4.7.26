'use client'

import { useState } from 'react'
import { X, Send, Users } from 'lucide-react'

interface Student {
  userId: string
  userName: string
  score: number
}

interface Props {
  students: Student[]
  onClose: () => void
  onSend: (studentIds: string[], message: string) => void
}

export default function BulkOutreachModal({ students, onClose, onSend }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(students.map(s => s.userId)))
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleStudent(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  async function handleSend() {
    setLoading(true)
    await onSend(Array.from(selected), message)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-[#0033A0]" />
            <h2 className="font-extrabold text-lg">Bulk Outreach</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select students ({selected.size} of {students.length})
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {students.map(s => (
                <label key={s.userId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(s.userId)}
                    onChange={() => toggleStudent(s.userId)}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{s.userName}</span>
                  <span className="text-xs text-gray-400">Score: {s.score}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write a supportive check-in message..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || selected.size === 0 || !message.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50"
          >
            <Send className="size-4" />
            {loading ? 'Sending...' : `Send to ${selected.size} students`}
          </button>
        </div>
      </div>
    </div>
  )
}
