'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Loader2, Lock, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

type Preference = {
  id: string
  type: string
  enabled: boolean
  channel: string
}

/** Types that are locked on — user cannot disable them */
const LOCKED_TYPES = new Set(['STAFF_ALERT_P0'])

export default function NotificationPreferences() {
  const { currentUser } = useAuth()
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/preferences', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferences)
        setLabels(data.labels)
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void fetchPrefs()
  }, [fetchPrefs])

  const handleChange = (type: string, value: 'in_app' | 'email' | 'off') => {
    if (LOCKED_TYPES.has(type)) return
    setPreferences((prev) =>
      prev.map((p) =>
        p.type === type
          ? { ...p, enabled: value !== 'off', channel: value }
          : p
      )
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          preferences: preferences.map((p) => ({
            type: p.type,
            enabled: p.enabled,
            channel: p.channel,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferences)
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
        <div className="flex items-center gap-2 mb-4">
          <Bell className="size-5 text-[#0033A0]" />
          <h2 className="text-base font-extrabold text-gray-900">Notifications</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-gray-400" />
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-[#0033A0]" />
          <h2 className="text-base font-extrabold text-gray-900">Notifications</h2>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002878] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Choose how you receive each type of notification. Critical staff alerts cannot be turned off.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                Notification
              </th>
              <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">
                In-App
              </th>
              <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">
                Email
              </th>
              <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">
                Off
              </th>
            </tr>
          </thead>
          <tbody>
            {preferences.map((pref) => {
              const isLocked = LOCKED_TYPES.has(pref.type)
              const currentValue = !pref.enabled || pref.channel === 'off' ? 'off' : pref.channel

              return (
                <tr key={pref.type} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">
                        {labels[pref.type] || pref.type}
                      </span>
                      {isLocked && (
                        <Lock className="size-3.5 text-amber-500" />
                      )}
                    </div>
                  </td>
                  {(['in_app', 'email', 'off'] as const).map((option) => (
                    <td key={option} className="px-4 py-3 text-center">
                      <input
                        type="radio"
                        name={`notif-${pref.type}`}
                        checked={currentValue === option}
                        onChange={() => handleChange(pref.type, option)}
                        disabled={isLocked}
                        className="size-4 text-[#0033A0] accent-[#0033A0] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
