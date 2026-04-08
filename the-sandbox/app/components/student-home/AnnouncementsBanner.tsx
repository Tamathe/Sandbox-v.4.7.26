'use client'

import { useState, useEffect } from 'react'
import { Info, AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react'

import type { Announcement } from '../../lib/types'

interface AnnouncementsBannerProps {
  userEmail: string
}

const STORAGE_KEY = 'uky-dismissed-announcements'

const TONE_STYLES: Record<string, string> = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
  URGENT: 'bg-red-50 border-red-200 text-red-800',
  SUCCESS: 'bg-emerald-50 border-emerald-200 text-emerald-800',
}

const TONE_ICONS: Record<string, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  URGENT: AlertCircle,
  SUCCESS: CheckCircle,
}

function getDismissed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function dismiss(id: string) {
  const list = getDismissed()
  if (!list.includes(id)) {
    list.push(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }
}

export default function AnnouncementsBanner({ userEmail }: AnnouncementsBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    setDismissed(getDismissed())
    if (!userEmail) return
    fetch('/api/announcements', { headers: { 'x-demo-user-email': userEmail } })
      .then(r => r.ok ? r.json() : { announcements: [] })
      .then(data => setAnnouncements(data.announcements || []))
      .catch(() => {})
  }, [userEmail])

  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map(a => {
        const tone = a.tone?.toUpperCase() || 'INFO'
        const styles = TONE_STYLES[tone] || TONE_STYLES.INFO
        const Icon = TONE_ICONS[tone] || Info
        return (
          <div key={a.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${styles}`}>
            <Icon className="size-4 flex-shrink-0" />
            <span className="text-sm font-medium flex-1 truncate">{a.title}</span>
            {a.dismissible !== false && (
              <button
                onClick={() => { dismiss(a.id); setDismissed(prev => [...prev, a.id]) }}
                className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
