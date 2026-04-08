'use client'

import React from 'react'
import { Calendar, Clock } from 'lucide-react'

interface CalendarEvent {
  title: string
  start: string
  end: string
  category?: string
}

interface Props {
  events: CalendarEvent[]
  startDate: string
  endDate: string
}

const CATEGORY_COLORS: Record<string, string> = {
  lecture: 'bg-blue-100 border-blue-300 text-blue-800',
  'office-hours': 'bg-green-100 border-green-300 text-green-800',
  meeting: 'bg-purple-100 border-purple-300 text-purple-800',
  personal: 'bg-amber-100 border-amber-300 text-amber-800',
  admin: 'bg-gray-100 border-gray-300 text-gray-800',
}

export default function AssistantCalendarView({ events, startDate, endDate }: Props) {
  // Group events by day
  const grouped = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const day = new Date(event.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const existing = grouped.get(day) ?? []
    existing.push(event)
    grouped.set(day, existing)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-white p-3 my-2">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="size-4 text-[#0033A0]" />
        <span className="text-xs font-bold text-[#0033A0] uppercase tracking-wide">Calendar</span>
        <span className="text-xs text-gray-400 ml-auto">
          {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {Array.from(grouped.entries()).map(([day, dayEvents]) => (
        <div key={day} className="mb-2 last:mb-0">
          <p className="text-xs font-semibold text-gray-500 mb-1">{day}</p>
          <div className="space-y-1">
            {dayEvents.map((event, i) => {
              const colorClass = CATEGORY_COLORS[event.category ?? ''] ?? CATEGORY_COLORS.meeting
              return (
                <div key={i} className={`rounded-lg border px-2 py-1 ${colorClass}`}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 shrink-0 opacity-60" />
                    <span className="text-xs font-medium truncate">{event.title}</span>
                  </div>
                  <p className="text-xs opacity-70 ml-4.5">
                    {formatTime(event.start)} – {formatTime(event.end)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {events.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No events in this range</p>
      )}
    </div>
  )
}
