'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'

interface DelegateModalProps {
  onConfirm: (targetEmail: string, note?: string) => void
  onCancel: () => void
}

export default function DelegateModal({ onConfirm, onCancel }: DelegateModalProps) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    await onConfirm(email.trim(), note.trim() || undefined)
    setSubmitting(false)
  }

  return (
    <ModalShell title="Delegate Action" icon={Users} onClose={onCancel} maxWidth="md">
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="delegate-email" className="block text-xs font-semibold text-gray-700 mb-1">
              Delegate to (name or email)
            </label>
            <input
              id="delegate-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane.smith@uky.edu"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="delegate-note" className="block text-xs font-semibold text-gray-700 mb-1">
              Note (optional)
            </label>
            <textarea
              id="delegate-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any context for the person receiving this..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || submitting}
              className="px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Delegating...' : 'Delegate'}
            </button>
          </div>
        </form>
    </ModalShell>
  )
}
