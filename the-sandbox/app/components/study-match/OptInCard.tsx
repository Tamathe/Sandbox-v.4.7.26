'use client'

import { useState } from 'react'
import { ToggleLeft, ToggleRight, Loader2, Users } from 'lucide-react'

interface StudyMatchProfile {
  id: string
  optedIn: boolean
  availableHours: Record<string, string[]> | null
  preferredSize: number
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening']
const TIME_RANGES: Record<string, string> = {
  Morning: '08:00-12:00',
  Afternoon: '12:00-17:00',
  Evening: '17:00-21:00',
}

interface OptInCardProps {
  profile: StudyMatchProfile | null
  userEmail: string
  onProfileChange: (profile: StudyMatchProfile) => void
}

export default function OptInCard({ profile, userEmail, onProfileChange }: OptInCardProps) {
  const [saving, setSaving] = useState(false)
  const [preferredSize, setPreferredSize] = useState(profile?.preferredSize ?? 3)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>(
    () => {
      if (!profile?.availableHours) return {}
      // Convert time ranges back to slot labels
      const slots: Record<string, string[]> = {}
      for (const [day, ranges] of Object.entries(profile.availableHours)) {
        slots[day] = ranges
          .map((r) => Object.entries(TIME_RANGES).find(([, v]) => v === r)?.[0])
          .filter(Boolean) as string[]
      }
      return slots
    },
  )

  const optedIn = profile?.optedIn ?? false

  function toggleSlot(day: string, slot: string) {
    setSelectedSlots((prev) => {
      const daySlots = prev[day] ?? []
      const updated = daySlots.includes(slot)
        ? daySlots.filter((s) => s !== slot)
        : [...daySlots, slot]
      if (updated.length === 0) {
        const copy = { ...prev }
        delete copy[day]
        return copy
      }
      return { ...prev, [day]: updated }
    })
  }

  async function save(newOptedIn: boolean) {
    setSaving(true)
    try {
      const availableHours: Record<string, string[]> = {}
      for (const [day, slots] of Object.entries(selectedSlots)) {
        availableHours[day] = slots.map((s) => TIME_RANGES[s]).filter(Boolean)
      }

      const res = await fetch('/api/study-match/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail },
        body: JSON.stringify({
          optedIn: newOptedIn,
          availableHours: Object.keys(availableHours).length > 0 ? availableHours : undefined,
          preferredSize,
        }),
      })
      const data = await res.json()
      if (data.profile) onProfileChange(data.profile)
    } catch (err) {
      console.error('Failed to update study match profile:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Study Matching</h2>
        </div>
        <button
          type="button"
          onClick={() => save(!optedIn)}
          disabled={saving}
          className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
        >
          {saving ? (
            <Loader2 className="size-5 animate-spin text-gray-400" />
          ) : optedIn ? (
            <ToggleRight className="size-6 text-[#0033A0]" />
          ) : (
            <ToggleLeft className="size-6 text-gray-400" />
          )}
          <span className={optedIn ? 'text-[#0033A0]' : 'text-gray-500'}>
            {optedIn ? 'Opted In' : 'Opt In'}
          </span>
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Find study partners whose strengths complement your gaps. We&apos;ll match you
        with classmates who can teach you — and learn from you.
      </p>

      {optedIn && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {/* Preferred group size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred group size
            </label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPreferredSize(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    preferredSize === n
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n} people
                </button>
              ))}
            </div>
          </div>

          {/* Availability grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When are you free to study?
            </label>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="pr-2" />
                    {TIME_SLOTS.map((slot) => (
                      <th key={slot} className="px-2 py-1 text-gray-500 font-medium">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td className="pr-2 font-medium text-gray-600">{day}</td>
                      {TIME_SLOTS.map((slot) => {
                        const active = selectedSlots[day]?.includes(slot)
                        return (
                          <td key={slot} className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() => toggleSlot(day, slot)}
                              className={`size-6 rounded transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#0033A0]'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              aria-label={`${day} ${slot}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save preferences */}
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Preferences
          </button>
        </div>
      )}
    </div>
  )
}
