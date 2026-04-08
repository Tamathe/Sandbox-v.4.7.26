'use client'

import { useState, useCallback } from 'react'
import { Mail, Download, X, Loader2, Check } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import type { MinutesData } from './MinutesCard'

interface DistributionPreviewProps {
  minutes: MinutesData
  committeeMembers: { name: string; role: string; email?: string; userId?: string }[]
  committeeId: string
  onSent: () => void
  onCancel: () => void
}

export default function DistributionPreview({
  minutes,
  committeeMembers,
  committeeId,
  onSent,
  onCancel,
}: DistributionPreviewProps) {
  const { currentUser } = useAuth()
  const [selected, setSelected] = useState<Set<number>>(() => new Set(committeeMembers.map((_, i) => i)))
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const toggleMember = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selected.size === committeeMembers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(committeeMembers.map((_, i) => i)))
    }
  }, [selected.size, committeeMembers])

  const handleSend = useCallback(async () => {
    setSending(true)
    try {
      const recipients = committeeMembers.filter((_, i) => selected.has(i))
      await fetch(`/api/staff/committees/${committeeId}/meetings/${minutes.id}/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ recipients }),
      })
      setSent(true)
      setTimeout(() => onSent(), 1200)
    } catch { /* ignore */ }
    setSending(false)
  }, [committeeId, minutes.id, committeeMembers, selected, currentUser.email, onSent])

  const handleDownload = useCallback(() => {
    if (!minutes.formattedMinutes) return
    const blob = new Blob([minutes.formattedMinutes], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `minutes-${minutes.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [minutes])

  const meetingDate = new Date(minutes.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const subject = `Minutes: ${minutes.committeeName} — Meeting #${minutes.meetingNumber} — ${meetingDate}`

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">Distribution Preview</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Subject line */}
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Subject</label>
          <div className="text-xs text-gray-800 font-medium bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            {subject}
          </div>
        </div>

        {/* Recipients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold uppercase text-gray-500">
              Recipients ({selected.size} of {committeeMembers.length})
            </label>
            <button
              onClick={toggleAll}
              className="text-[10px] font-semibold text-[#0033A0] hover:underline"
            >
              {selected.size === committeeMembers.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
            {committeeMembers.map((member, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } hover:bg-blue-50/30`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleMember(i)}
                  className="rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]/20 size-3.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-900">{member.name}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{member.role}</span>
                </div>
                {member.email && (
                  <span className="text-[10px] text-gray-400 truncate max-w-[100px] sm:max-w-[180px] hidden sm:inline">{member.email}</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Email body preview */}
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Email Body Preview</label>
          <div className="border border-gray-100 rounded-xl bg-gray-50/50 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed p-4 font-sans">
              {minutes.formattedMinutes ?? 'No formatted minutes available.'}
            </pre>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => void handleSend()}
            disabled={sending || sent || selected.size === 0}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              sent
                ? 'bg-green-600 text-white'
                : 'bg-[#0033A0] text-white hover:bg-[#002580]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {sent ? (
              <><Check className="size-3.5" /> Sent!</>
            ) : sending ? (
              <><Loader2 className="size-3.5 animate-spin" /> Sending...</>
            ) : (
              <><Mail className="size-3.5" /> Send to {selected.size} recipient{selected.size !== 1 ? 's' : ''}</>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={!minutes.formattedMinutes}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="size-3.5" />
            Download .md
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
