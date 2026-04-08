'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

const INTERVENTION_TYPES = [
  { value: 'SANDY_NUDGE', label: 'Sandy Nudge' },
  { value: 'INSTRUCTOR_OUTREACH', label: 'Personal Outreach' },
  { value: 'ADVISOR_MEETING', label: 'Advisor Meeting' },
  { value: 'PEER_CONNECTION', label: 'Peer Connection' },
  { value: 'RESOURCE_REFERRAL', label: 'Resource Referral' },
  { value: 'ACCOMMODATION_REVIEW', label: 'Accommodation Review' },
  { value: 'CUSTOM', label: 'Custom Action' },
]

interface Props {
  alertId: string
  onSubmit: () => void
}

export default function InterventionForm({ alertId, onSubmit }: Props) {
  const [type, setType] = useState('INSTRUCTOR_OUTREACH')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/success/alert/${alertId}/intervene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, notes }),
      })
      if (res.ok) {
        setNotes('')
        onSubmit()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Intervention Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          {INTERVENTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What did you do? How did the student respond?"
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          rows={3}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !notes.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50"
      >
        <Send className="size-4" />
        {loading ? 'Recording...' : 'Record Intervention'}
      </button>
    </form>
  )
}
