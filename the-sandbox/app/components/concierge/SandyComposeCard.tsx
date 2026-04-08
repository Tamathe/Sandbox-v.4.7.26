'use client'

import React, { useState } from 'react'
import { Mail, Send, PenLine } from 'lucide-react'
import Link from 'next/link'

interface Contact {
  name: string
  email: string
  role: string
  context: string
}

interface SandyComposeCardProps {
  suggestedRecipient?: { name: string; email: string; role: string }
  suggestedSubject?: string
  suggestedTone?: 'polished' | 'warm' | 'concise'
  knownContacts: Contact[]
  onSandyDraft: (to: string, subject: string, tone: string) => void
}

const TONE_OPTIONS = [
  { value: 'polished', label: 'Polished' },
  { value: 'warm', label: 'Warm' },
  { value: 'concise', label: 'Concise' },
] as const

export default function SandyComposeCard({
  suggestedRecipient,
  suggestedSubject,
  suggestedTone = 'polished',
  knownContacts,
  onSandyDraft,
}: SandyComposeCardProps) {
  const [to, setTo] = useState(suggestedRecipient?.email ?? '')
  const [toName, setToName] = useState(suggestedRecipient?.name ?? '')
  const [subject, setSubject] = useState(suggestedSubject ?? '')
  const [tone, setTone] = useState<string>(suggestedTone)
  const [showContacts, setShowContacts] = useState(false)

  const handleSelectContact = (contact: Contact) => {
    setTo(contact.email)
    setToName(contact.name)
    setShowContacts(false)
  }

  const handleSandyDraft = () => {
    onSandyDraft(toName || to, subject, tone)
  }

  const writeItMyselfUrl = `/write-room/email-rewriter${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`

  return (
    <div className="rounded-xl border border-[#0033A0]/20 bg-white p-3 my-1.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="size-6 bg-[#0033A0] rounded-full flex items-center justify-center">
          <Mail className="size-3 text-white" />
        </div>
        <span className="text-xs font-bold text-[#0033A0] uppercase tracking-wide">New Email</span>
      </div>

      {/* To field */}
      <div className="mb-2 relative">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5 block">To</label>
        <input
          type="text"
          value={toName || to}
          onChange={(e) => { setToName(e.target.value); setTo(e.target.value) }}
          onFocus={() => knownContacts.length > 0 && setShowContacts(true)}
          onBlur={() => setTimeout(() => setShowContacts(false), 200)}
          placeholder="Recipient name or email"
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]/20 outline-none"
        />
        {showContacts && knownContacts.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-0.5 rounded-lg border border-gray-200 bg-white shadow-lg max-h-32 overflow-y-auto">
            {knownContacts.map((c) => (
              <button
                key={c.email}
                type="button"
                onMouseDown={() => handleSelectContact(c)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-xs flex items-center justify-between gap-2"
              >
                <span className="font-medium text-gray-800 truncate">{c.name}</span>
                <span className="text-gray-400 text-[10px] shrink-0">{c.context}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subject field */}
      <div className="mb-3">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5 block">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What is this about?"
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]/20 outline-none"
        />
      </div>

      {/* Tone selector */}
      <div className="mb-3">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Tone</label>
        <div className="flex gap-1.5">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tone === opt.value
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSandyDraft}
          disabled={!to && !toName}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-2 text-xs font-semibold text-white hover:bg-[#002880] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="size-3" />
          Sandy, draft this
        </button>
        <Link
          href={writeItMyselfUrl}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <PenLine className="size-3" />
          Write myself
        </Link>
      </div>
    </div>
  )
}
