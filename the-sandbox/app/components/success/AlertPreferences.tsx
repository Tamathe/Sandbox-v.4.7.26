'use client'

import { useState, useEffect } from 'react'
import { Settings, Save } from 'lucide-react'

const SEVERITY_OPTIONS = ['WATCH', 'CONCERN', 'URGENT', 'CRITICAL']

export default function AlertPreferences() {
  const [prefs, setPrefs] = useState({
    minSeverity: 'CONCERN',
    emailDigest: true,
    briefingInject: true,
    sandyNotify: true,
    batchWindow: 24,
    quietStart: null as number | null,
    quietEnd: null as number | null,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/success/preferences')
      .then(r => r.json())
      .then(setPrefs)
  }, [])

  async function handleSave() {
    setLoading(true)
    await fetch('/api/success/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="size-5 text-gray-400" />
        <h3 className="font-extrabold text-lg">Alert Preferences</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Severity</label>
          <select
            value={prefs.minSeverity}
            onChange={e => setPrefs({ ...prefs, minSeverity: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {SEVERITY_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Only receive alerts at or above this level</p>
        </div>

        <div className="space-y-2">
          {[
            { key: 'emailDigest' as const, label: 'Daily email digest' },
            { key: 'briefingInject' as const, label: 'Include in morning briefing' },
            { key: 'sandyNotify' as const, label: 'Sandy mentions in concierge' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={e => setPrefs({ ...prefs, [key]: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Window (hours)</label>
          <input
            type="number"
            value={prefs.batchWindow}
            onChange={e => setPrefs({ ...prefs, batchWindow: parseInt(e.target.value) || 24 })}
            className="border rounded-lg px-3 py-2 text-sm w-20"
            min={0}
            max={48}
          />
          <p className="text-xs text-gray-400 mt-1">0 = real-time notifications</p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-[#002880] disabled:opacity-50"
        >
          <Save className="size-4" />
          {saved ? 'Saved!' : loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
