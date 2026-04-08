'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, Loader2, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Preferences {
  tone: string
  proactivityLevel: string
  responseLength: string
  showChips: boolean
}

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', desc: 'Professional, precise language' },
  { value: 'balanced', label: 'Balanced', desc: 'Warm but clear (default)' },
  { value: 'casual', label: 'Casual', desc: 'Friendly, conversational' },
]

const PROACTIVITY_OPTIONS = [
  { value: 'off', label: 'Off', desc: 'Only responds when asked' },
  { value: 'low', label: 'Low', desc: 'Only urgent items' },
  { value: 'medium', label: 'Medium', desc: 'Helpful nudges (default)' },
  { value: 'high', label: 'High', desc: 'Actively suggests' },
]

const LENGTH_OPTIONS = [
  { value: 'concise', label: 'Concise', desc: '1-2 sentences' },
  { value: 'standard', label: 'Standard', desc: '2-4 sentences (default)' },
  { value: 'detailed', label: 'Detailed', desc: 'Thorough explanations' },
]

export default function SandyPreferences() {
  const { currentUser } = useAuth()
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/sandy/preferences', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setPrefs(data.preferences)
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void fetchPrefs()
  }, [fetchPrefs])

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/sandy/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify(prefs),
      })
      if (res.ok) {
        const data = await res.json()
        setPrefs(data.preferences)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading Sandy preferences...</span>
        </div>
      </section>
    )
  }

  if (!prefs) return null

  return (
    <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="size-5 text-[#0033A0]" />
        <h2 className="text-base font-extrabold text-gray-900">Sandy Preferences</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Customize how Sandy communicates with you. Changes take effect on your next conversation.
      </p>

      <div className="space-y-6">
        {/* Tone */}
        <RadioGroup
          label="Tone"
          options={TONE_OPTIONS}
          value={prefs.tone}
          onChange={(v) => { setPrefs({ ...prefs, tone: v }); setSaved(false) }}
        />

        {/* Proactivity */}
        <RadioGroup
          label="Proactivity"
          options={PROACTIVITY_OPTIONS}
          value={prefs.proactivityLevel}
          onChange={(v) => { setPrefs({ ...prefs, proactivityLevel: v }); setSaved(false) }}
        />

        {/* Response Length */}
        <RadioGroup
          label="Response Length"
          options={LENGTH_OPTIONS}
          value={prefs.responseLength}
          onChange={(v) => { setPrefs({ ...prefs, responseLength: v }); setSaved(false) }}
        />

        {/* Chips toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.showChips}
              onChange={(e) => { setPrefs({ ...prefs, showChips: e.target.checked }); setSaved(false) }}
              className="size-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
            />
            <div>
              <span className="text-sm font-semibold text-gray-900">Starter Suggestion Chips</span>
              <p className="text-xs text-gray-500">Show quick-reply suggestions when opening Sandy on a new page</p>
            </div>
          </label>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002880] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Preferences'}
        </button>
      </div>
    </section>
  )
}

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string; desc: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-gray-900 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border-2 px-3 py-2 text-left transition-colors ${
              value === opt.value
                ? 'border-[#0033A0] bg-[#0033A0]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
            <div className="text-xs text-gray-500">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
