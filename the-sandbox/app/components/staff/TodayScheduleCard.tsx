'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { useAuth } from '../../lib/auth-context'
import { StaffCard } from './StaffCard'

export interface ScheduleEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
}

interface TodayScheduleCardProps {
  /** If provided, uses these instead of fetching. */
  events?: ScheduleEvent[]
}

function isCurrentEvent(start: string, end: string): boolean {
  try {
    const now = new Date()
    return isWithinInterval(now, { start: new Date(start), end: new Date(end) })
  } catch {
    return false
  }
}

export default function TodayScheduleCard({ events: propEvents }: TodayScheduleCardProps = {}) {
  const { currentUser } = useAuth()
  const [fetchedEvents, setFetchedEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(!propEvents)

  const events = propEvents ?? fetchedEvents

  const fetchSchedule = useCallback(async () => {
    if (propEvents) return
    setLoading(true)
    try {
      const today = new Date()
      const from = startOfDay(today).toISOString()
      const to = endOfDay(today).toISOString()
      const res = await fetch(`/api/assistant/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json() as { events: ScheduleEvent[] }
        setFetchedEvents(data.events ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [currentUser.email, propEvents])

  useEffect(() => { void fetchSchedule() }, [fetchSchedule])

  return (
    <StaffCard
      title="Today's Schedule"
      icon={Calendar}
      loading={loading}
      isEmpty={events.length === 0}
      emptyMessage="No events scheduled for today."
      loadingSkeleton={
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-1">
        {events.map(event => {
          const isCurrent = isCurrentEvent(event.startTime, event.endTime)
          return (
            <div
              key={event.id}
              className={`flex items-start gap-3 px-3 py-2 rounded-xl transition-colors ${
                isCurrent
                  ? 'border-l-[3px] border-l-[#0033A0] bg-blue-50/50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm font-medium whitespace-nowrap mt-0.5 ${
                isCurrent ? 'text-[#0033A0]' : 'text-gray-500'
              }`}>
                {event.isAllDay ? 'All day' : format(new Date(event.startTime), 'h:mm a')}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${
                  isCurrent ? 'text-[#0033A0]' : 'text-gray-800'
                }`}>
                  {event.title}
                </p>
                {event.location && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </StaffCard>
  )
}
