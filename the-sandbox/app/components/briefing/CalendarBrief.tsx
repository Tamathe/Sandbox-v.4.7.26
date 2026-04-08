'use client'

// ─── Calendar Brief ──────────────────────────────────────────
// Annotated timeline of today's events with Sandy's contextual notes.
// Every event is clickable → course page, Meeting Machine, or Sandy.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, MapPin, AlertCircle, Users } from 'lucide-react'
import { CappedList } from '../CappedList'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startTime: string | Date
  endTime: string | Date
  location: string | null
  attendees: string[]
  category: string | null
  annotation?: {
    note: string
    hasConflict: boolean
  }
}

interface CalendarBriefProps {
  events: CalendarEvent[]
}

/** Match a course code pattern like "TEK-100" in an event title */
function extractCourseCode(title: string): string | null {
  const match = title.match(/\b[A-Z]{2,5}-?\d{3,4}\b/)
  return match ? match[0] : null
}

function getEventClickTarget(event: CalendarEvent): { type: 'course' | 'meeting' | 'sandy'; value: string } {
  const courseCode = extractCourseCode(event.title)
  if (courseCode || event.category === 'lecture' || event.category === 'office-hours') {
    return { type: 'course', value: courseCode ?? '' }
  }
  if (event.category === 'meeting') {
    return { type: 'meeting', value: event.title }
  }
  return { type: 'sandy', value: event.title }
}

export default function CalendarBrief({ events, tomorrowEvents }: CalendarBriefProps & { tomorrowEvents?: CalendarEvent[] }) {
  const [view, setView] = useState<'today' | 'tomorrow'>('today')
  const displayEvents = view === 'tomorrow' ? (tomorrowEvents ?? []) : events
  const hasTomorrow = (tomorrowEvents ?? []).length > 0

  if (events.length === 0 && !hasTomorrow) {
    return (
      <div className="border-2 rounded-2xl p-6 bg-white">
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">Today&apos;s Schedule</h2>
        <p className="text-gray-500 text-sm">No events today. A rare gift — use it well.</p>
      </div>
    )
  }

  return (
    <div className="border-2 rounded-2xl p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900">
          {view === 'today' ? "Today\u2019s Schedule" : 'Tomorrow'}
        </h2>
        {(hasTomorrow || events.length > 0) && (
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={() => setView('today')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${view === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setView('tomorrow')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${view === 'tomorrow' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tomorrow
            </button>
          </div>
        )}
      </div>

      {displayEvents.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {view === 'tomorrow' ? 'Nothing on the books for tomorrow.' : 'No events today. A rare gift — use it well.'}
        </p>
      ) : (
        <CappedList
          items={displayEvents}
          cap={4}
          noun="events"
          className="space-y-1"
          renderItem={(event, i) => (
            <CalendarEventCard key={event.id} event={event} isFirst={i === 0} isLast={i === displayEvents.length - 1} />
          )}
        />
      )}
    </div>
  )
}

function CalendarEventCard({ event, isFirst, isLast }: { event: CalendarEvent; isFirst: boolean; isLast: boolean }) {
  const router = useRouter()
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const now = new Date()
  const isNow = start <= now && end >= now
  const isPast = end < now

  const timeStr = `${formatTime(start)} – ${formatTime(end)}`
  const target = getEventClickTarget(event)

  const categoryColors: Record<string, string> = {
    lecture: 'bg-blue-100 text-blue-800',
    'office-hours': 'bg-green-100 text-green-800',
    meeting: 'bg-amber-100 text-amber-800',
    personal: 'bg-purple-100 text-purple-800',
    admin: 'bg-slate-100 text-slate-800',
  }

  const catClass = categoryColors[event.category ?? ''] ?? 'bg-slate-100 text-slate-800'

  function handleClick() {
    if (target.type === 'course') {
      router.push('/courses')
    } else if (target.type === 'meeting') {
      window.dispatchEvent(
        new CustomEvent('sandy-prefill', {
          detail: { message: `Tell me about my meeting: ${event.title}`, autoSend: true },
        }),
      )
    } else {
      window.dispatchEvent(
        new CustomEvent('sandy-prefill', {
          detail: { message: `Tell me about "${event.title}" on my calendar today`, autoSend: true },
        }),
      )
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex w-full gap-3 py-3 px-3 rounded-xl text-left transition-colors cursor-pointer ${
        isNow ? 'bg-blue-50 ring-2 ring-[#0033A0]' : isPast ? 'opacity-50' : 'hover:bg-slate-50'
      } ${event.annotation?.hasConflict ? 'border-l-4 border-red-400' : ''}`}
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1.5">
        <div className={`size-2.5 rounded-full ${isNow ? 'bg-[#0033A0] animate-pulse' : isPast ? 'bg-gray-300' : 'bg-gray-400'}`} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <Clock className="size-3" />
            {timeStr}
          </span>
          {isNow && (
            <span className="text-xs font-bold text-[#0033A0] bg-blue-100 px-2 py-0.5 rounded-full">NOW</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catClass}`}>
            {event.category ?? 'event'}
          </span>
          {event.annotation?.hasConflict && (
            <span className="text-xs text-red-600 flex items-center gap-0.5">
              <AlertCircle className="size-3" /> Conflict
            </span>
          )}
        </div>

        <h3 className={`font-semibold text-sm mt-1 ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
          {event.title}
        </h3>

        {/* Location + Attendees */}
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {event.location}
            </span>
          )}
          {event.attendees.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {event.attendees.length}
            </span>
          )}
        </div>

        {/* Sandy's annotation */}
        {event.annotation?.note && (
          <p className="text-xs text-[#0033A0] mt-1.5 italic">
            Sandy: {event.annotation.note}
          </p>
        )}
      </div>
    </button>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
