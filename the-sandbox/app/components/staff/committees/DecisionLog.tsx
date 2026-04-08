'use client'

import { useState } from 'react'
import { Vote, Search, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export interface Decision {
  id: string
  decision: string
  vote: string | null
  context: string
  movedBy: string | null
  secondedBy: string | null
  meetingId: string
  meetingNumber?: number
  meetingDate: string
}

interface DecisionLogProps {
  decisions: Decision[]
  loading?: boolean
  onMeetingClick?: (meetingId: string) => void
}

export default function DecisionLog({ decisions, loading, onMeetingClick }: DecisionLogProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? decisions.filter((d) =>
        d.decision.toLowerCase().includes(search.toLowerCase()) ||
        d.context.toLowerCase().includes(search.toLowerCase())
      )
    : decisions

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-4">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search decisions..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0]"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Vote className="size-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-600">
            {search ? 'No matching decisions' : 'No decisions yet'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {search ? 'Try a different search term.' : 'Decisions from meetings will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((decision, i) => (
            <div
              key={decision.id ?? `${decision.meetingId}-${i}`}
              className="rounded-2xl border-2 border-gray-100 p-4 bg-white hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{decision.decision}</p>
                  {decision.context && (
                    <p className="text-xs text-gray-500 mt-1">{decision.context}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {decision.vote && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0033A0]">
                        <Vote className="size-3" />
                        {decision.vote}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="size-3" />
                      {format(new Date(decision.meetingDate), 'MMM d, yyyy')}
                    </span>
                    {decision.meetingNumber != null && onMeetingClick && (
                      <button
                        onClick={() => onMeetingClick(decision.meetingId)}
                        className="text-xs font-semibold text-[#0033A0] hover:underline"
                      >
                        Meeting #{decision.meetingNumber}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
