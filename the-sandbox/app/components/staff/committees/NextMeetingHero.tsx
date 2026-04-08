'use client'

import { Calendar, MapPin, Clock, ListChecks, Pencil, Play, MessageSquare, ArrowRight } from 'lucide-react'
import type { AgendaItem } from './AgendaEditor'

interface NextMeetingHeroProps {
  committee: {
    id: string
    name: string
    cadence: string | null
    meetingDay: string | null
    meetingTime: string | null
    meetingLocation: string | null
  }
  agenda: AgendaItem[]
  openActionItems: number
  onStartMeeting: () => void
  onEditAgenda: () => void
  isInMeeting?: boolean
  meetingDuration?: string
}

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

function computeNextMeetingDate(
  cadence: string | null,
  meetingDay: string | null,
  meetingTime?: string | null
): Date | null {
  if (!meetingDay) return null
  const targetDay = DAY_MAP[meetingDay.toLowerCase()]
  if (targetDay === undefined) return null

  const now = new Date()
  const next = new Date(now)
  const currentDay = next.getDay()
  let daysUntil = (targetDay - currentDay + 7) % 7
  if (daysUntil === 0) daysUntil = 7

  if (cadence === 'biweekly') {
    daysUntil = daysUntil === 0 ? 14 : daysUntil
  } else if (cadence === 'monthly') {
    daysUntil = daysUntil === 0 ? 28 : daysUntil + 21
  }

  next.setDate(next.getDate() + daysUntil)

  if (meetingTime) {
    const match = meetingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const ampm = match[3]?.toUpperCase()
      if (ampm === 'PM' && hours < 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0
      next.setHours(hours, minutes, 0, 0)
    } else {
      next.setHours(10, 0, 0, 0)
    }
  } else {
    next.setHours(10, 0, 0, 0)
  }

  return next
}

function formatCountdown(target: Date): string {
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  if (diff < 0) return 'today'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function handlePrepWithSandy(committeeName: string) {
  window.dispatchEvent(
    new CustomEvent('sandy-prefill', {
      detail: {
        message: `Help me prepare for the upcoming ${committeeName} meeting. What should I focus on based on our agenda and open action items?`,
        autoSend: true,
      },
    })
  )
}

export default function NextMeetingHero({
  committee,
  agenda,
  openActionItems,
  onStartMeeting,
  onEditAgenda,
  isInMeeting,
  meetingDuration,
}: NextMeetingHeroProps) {
  const nextDate = computeNextMeetingDate(committee.cadence, committee.meetingDay, committee.meetingTime)

  if (!nextDate) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center">
        <Calendar className="size-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-500">Schedule your next meeting</p>
        <p className="text-xs text-gray-400 mt-1">Set a cadence and meeting day in committee settings to see your next meeting here.</p>
      </div>
    )
  }

  const countdown = formatCountdown(nextDate)
  const previewItems = agenda.slice(0, 4)
  const moreCount = agenda.length - 4

  return (
    <div className="border-2 border-[#0033A0]/10 rounded-2xl bg-gradient-to-r from-[#0033A0]/5 to-white p-5">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left — Date, time, location OR meeting-in-progress */}
        <div className="flex-1 min-w-0">
          {isInMeeting ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Meeting in Progress</span>
                {meetingDuration && (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{meetingDuration}</span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-gray-900">{formatDate(new Date())}</h2>
              {committee.meetingLocation && (
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                  <MapPin className="size-3.5 text-gray-400" />
                  {committee.meetingLocation}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={onStartMeeting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ArrowRight className="size-4" />
                  Return to Meeting
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[#0033A0]/60 uppercase tracking-wide">Next Meeting</span>
                <span className="text-xs font-bold text-[#0033A0] bg-[#0033A0]/10 rounded-full px-2 py-0.5">{countdown}</span>
              </div>
              <h2 className="text-lg font-extrabold text-gray-900">{formatDate(nextDate)}</h2>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-gray-400" />
                  {formatTime(nextDate)}
                </span>
                {committee.meetingLocation && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-gray-400" />
                    {committee.meetingLocation}
                  </span>
                )}
              </div>

              {openActionItems > 0 && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                    <ListChecks className="size-3.5" />
                    {openActionItems} open action item{openActionItems !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={onStartMeeting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#0033A0] rounded-lg hover:bg-[#0033A0]/90 transition-colors"
                >
                  <Play className="size-4" />
                  Start Meeting
                </button>
                <button
                  type="button"
                  onClick={() => handlePrepWithSandy(committee.name)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#0033A0] bg-[#0033A0]/10 rounded-lg hover:bg-[#0033A0]/15 transition-colors"
                >
                  <MessageSquare className="size-4" />
                  Prep with Sandy
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right — Agenda preview */}
        <div className="lg:w-72 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agenda</span>
            {!isInMeeting && (
              <button
                type="button"
                onClick={onEditAgenda}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:text-[#0033A0]/80"
              >
                <Pencil className="size-3" />
                Edit
              </button>
            )}
          </div>
          {agenda.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No agenda items yet. Click Edit to add items.</p>
          ) : (
            <ul className="space-y-1">
              {previewItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-xs text-gray-400 mt-0.5 shrink-0">{i + 1}.</span>
                  <span className="line-clamp-1">{item.title || '(untitled)'}</span>
                  {item.timeMinutes ? (
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">{item.timeMinutes}m</span>
                  ) : null}
                </li>
              ))}
              {moreCount > 0 && (
                <li className="text-xs text-gray-400 pl-5">+{moreCount} more</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
