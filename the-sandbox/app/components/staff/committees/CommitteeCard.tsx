'use client'

import { Users, Calendar, ListChecks, FileText, Eye, Sparkles, Play, ClipboardList } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

export interface CommitteeOverview {
  id: string
  name: string
  type: string
  cadence: string | null
  meetingDay: string | null
  meetingTime: string | null
  nextMeeting: string | null
  openActionItems: number
  pendingMinutes: number
  memberCount: number
  agendaItemCount?: number
}

interface CommitteeCardProps {
  committee: CommitteeOverview
  onView: (id: string) => void
  onGenerateMinutes: (id: string) => void
  onStartMeeting?: (id: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  compliance: 'bg-red-100 text-red-800',
  operations: 'bg-blue-100 text-blue-800',
  facilities: 'bg-amber-100 text-amber-800',
  finance: 'bg-green-100 text-green-800',
  hr: 'bg-purple-100 text-purple-800',
  academic: 'bg-indigo-100 text-indigo-800',
  governance: 'bg-teal-100 text-teal-800',
}

export default function CommitteeCard({ committee, onView, onGenerateMinutes, onStartMeeting }: CommitteeCardProps) {
  const nextDate = committee.nextMeeting ? new Date(committee.nextMeeting) : null
  const daysUntil = nextDate ? differenceInDays(nextDate, new Date()) : null
  const daysLabel =
    daysUntil === null ? null
    : daysUntil === 0 ? 'Today'
    : daysUntil === 1 ? 'Tomorrow'
    : daysUntil > 0 ? `in ${daysUntil} days`
    : `${Math.abs(daysUntil)} days ago`

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden hover:border-gray-300 transition-colors">
      <div className="p-5">
        {/* Title + type badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-[#0033A0] shrink-0" />
            <h3 className="text-base font-extrabold text-gray-900 leading-tight">
              {committee.name}
            </h3>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_COLORS[committee.type] ?? 'bg-gray-100 text-gray-700'}`}>
            {committee.type}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {nextDate && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
              <Calendar className="size-3" />
              {format(nextDate, 'EEE, MMM d')}
              {daysLabel && (
                <span className={`font-semibold ${daysUntil !== null && daysUntil <= 1 ? 'text-[#0033A0]' : ''}`}>
                  ({daysLabel})
                </span>
              )}
            </span>
          )}
          {committee.openActionItems > 0 && (
            <span className="inline-flex items-center gap-1 text-xs">
              <ListChecks className="size-3 text-amber-600" />
              <span className="font-semibold text-amber-700">{committee.openActionItems} open action{committee.openActionItems !== 1 ? 's' : ''}</span>
            </span>
          )}
          {committee.pendingMinutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs">
              <FileText className="size-3 text-red-500" />
              <span className="font-semibold text-red-600">{committee.pendingMinutes} pending minutes</span>
            </span>
          )}
          {(committee.agendaItemCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs">
              <ClipboardList className="size-3 text-[#0033A0]" />
              <span className="font-semibold text-gray-600">{committee.agendaItemCount} agenda item{committee.agendaItemCount !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(committee.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Eye className="size-3.5" />
            View
          </button>
          {onStartMeeting && (
            <button
              onClick={() => onStartMeeting(committee.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <Play className="size-3.5" />
              Start Meeting
            </button>
          )}
          <button
            onClick={() => onGenerateMinutes(committee.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0033A0] text-white hover:bg-[#002580] transition-colors"
          >
            <Sparkles className="size-3.5" />
            Generate Minutes
          </button>
        </div>
      </div>
    </div>
  )
}
