'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Info, Megaphone, X } from 'lucide-react'

import type { Announcement } from '../lib/types'

const toneStyles: Record<string, string> = {
  INFO: 'border-blue-200 bg-blue-50 text-blue-900',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
  CRITICAL: 'border-red-200 bg-red-50 text-red-900',
}

function getToneIcon(tone: string) {
  if (tone === 'CRITICAL') return AlertTriangle
  if (tone === 'WARNING') return Megaphone
  return Info
}

export default function PlatformAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('uky-dismissed-announcements')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    let cancelled = false

    const loadAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setAnnouncements(Array.isArray(data.announcements) ? data.announcements : [])
        }
      } catch {}
    }

    void loadAnnouncements()
    return () => {
      cancelled = true
    }
  }, [])

  const visibleAnnouncements = useMemo(
    () =>
      announcements.filter(
        (announcement) => !announcement.dismissible || !dismissedIds.includes(announcement.id)
      ),
    [announcements, dismissedIds]
  )

  if (visibleAnnouncements.length === 0) {
    return null
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      {visibleAnnouncements.map((announcement) => {
        const Icon = getToneIcon(announcement.tone)
        const style = toneStyles[announcement.tone] ?? toneStyles.INFO

        return (
          <div
            key={announcement.id}
            className={`border-b px-4 py-3 text-sm last:border-b-0 ${style}`}
          >
            <div className="mx-auto flex max-w-7xl items-start gap-3">
              <Icon className="mt-0.5 size-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{announcement.title}</div>
                <div className="mt-0.5 text-sm/6 opacity-90">{announcement.message}</div>
              </div>
              {announcement.dismissible ? (
                <button
                  type="button"
                  onClick={() => {
                    const nextDismissed = [...dismissedIds, announcement.id]
                    setDismissedIds(nextDismissed)
                    try {
                      localStorage.setItem(
                        'uky-dismissed-announcements',
                        JSON.stringify(nextDismissed)
                      )
                    } catch {}
                  }}
                  className="rounded-md p-1 opacity-70 transition hover:bg-white/50 hover:opacity-100"
                  aria-label="Dismiss announcement"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
