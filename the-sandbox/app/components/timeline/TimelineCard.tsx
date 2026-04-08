'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, ArrowRight, Activity, Brain, ArrowRightLeft } from 'lucide-react'
import TimelineEventCard from './TimelineEventCard'

interface TimelineEvent {
  id: string
  timestamp: string
  type: string
  courseCode?: string
  title: string
  description: string
  magnitude: 'minor' | 'notable' | 'breakthrough'
  metadata: Record<string, unknown>
}

interface TimelineStats {
  totalSessions: number
  conceptsMastered: number
  transferEvents: number
}

interface TimelineCardProps {
  userEmail: string
}

export default function TimelineCard({ userEmail }: TimelineCardProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [stats, setStats] = useState<TimelineStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/timeline?limit=5', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? [])
        if (data.stats) {
          setStats({
            totalSessions: data.stats.totalSessions,
            conceptsMastered: data.stats.conceptsMastered,
            transferEvents: data.stats.transferEvents,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userEmail])

  if (loading) {
    return (
      <div className="border-2 rounded-2xl border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="border-2 rounded-2xl border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="size-4 text-[#0033A0]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Learning Timeline</h3>
        </div>
        <p className="text-sm text-gray-400">
          No learning events yet — complete a tool session to start your timeline!
        </p>
      </div>
    )
  }

  return (
    <div className="border-2 rounded-2xl border-gray-200 p-6 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[#0033A0]" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Learning Timeline</h3>
        </div>
        <Link
          href="/timeline"
          className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1"
        >
          View Full Timeline <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Compact event list */}
      <div className="divide-y divide-gray-100">
        {events.map((event) => (
          <TimelineEventCard key={event.id} event={event} compact />
        ))}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Activity className="size-3 text-orange-500" />
            {stats.totalSessions} sessions
          </span>
          <span className="flex items-center gap-1">
            <Brain className="size-3 text-purple-500" />
            {stats.conceptsMastered} mastered
          </span>
          <span className="flex items-center gap-1">
            <ArrowRightLeft className="size-3 text-green-500" />
            {stats.transferEvents} transfers
          </span>
        </div>
      )}
    </div>
  )
}
