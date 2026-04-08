'use client'

import { startOfWeek, format } from 'date-fns'
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

interface TimelineStreamProps {
  events: TimelineEvent[]
}

export default function TimelineStream({ events }: TimelineStreamProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 py-12 text-center">
        <p className="text-gray-400 text-sm">
          No learning events yet — complete a tool session to start your timeline!
        </p>
      </div>
    )
  }

  // Group events by week
  const weekGroups = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const weekStart = startOfWeek(new Date(event.timestamp), { weekStartsOn: 1 })
    const key = weekStart.toISOString()
    const group = weekGroups.get(key) ?? []
    group.push(event)
    weekGroups.set(key, group)
  }

  // Sort weeks descending
  const sortedWeeks = Array.from(weekGroups.entries()).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-6">
      {sortedWeeks.map(([weekKey, weekEvents]) => (
        <div key={weekKey}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Week of {format(new Date(weekKey), 'MMMM d, yyyy')}
          </h3>
          <div className="space-y-2">
            {weekEvents.map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
