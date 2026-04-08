'use client'

import { Calendar, ListChecks, Eye } from 'lucide-react'
import { format } from 'date-fns'

export interface MeetingSummary {
  id: string
  meetingNumber: number
  date: string
  status: string
  actionItemCount: number
  hasMinutes: boolean
}

interface MeetingsListProps {
  meetings: MeetingSummary[]
  loading?: boolean
  onViewMinutes: (meetingId: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  finalized: 'bg-green-100 text-green-800',
}

export default function MeetingsList({ meetings, loading, onViewMinutes }: MeetingsListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-10">
        <Calendar className="size-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-600">No meetings yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Generate minutes to create the first meeting record.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {meetings.map((meeting) => {
        const d = new Date(meeting.date)
        return (
          <div
            key={meeting.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-[#0033A0]/10 flex items-center justify-center">
                <span className="text-xs font-bold text-[#0033A0]">#{meeting.meetingNumber}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {format(d, 'EEEE, MMM d, yyyy')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${STATUS_STYLES[meeting.status] ?? STATUS_STYLES.draft}`}>
                    {meeting.status}
                  </span>
                  {meeting.actionItemCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                      <ListChecks className="size-3" />
                      {meeting.actionItemCount} action{meeting.actionItemCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {meeting.hasMinutes && (
              <button
                onClick={() => onViewMinutes(meeting.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
              >
                <Eye className="size-3.5" />
                View Minutes
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
