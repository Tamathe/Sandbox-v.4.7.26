'use client'

import { Calendar, Zap } from 'lucide-react'
import type { TomorrowPreview as TomorrowPreviewData } from '../../lib/faculty/day-lifecycle-service'

export default function TomorrowPreview({ data }: { data: TomorrowPreviewData }) {
  const dateLabel = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  if (data.calendar.length === 0 && data.expectedAttention.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-extrabold text-gray-900">Tomorrow at a Glance</h2>
        <span className="text-xs font-medium text-gray-400">{dateLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
        {/* Schedule */}
        {data.calendar.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-[#0033A0]" />
              <span className="text-xs font-bold uppercase tracking-wide text-[#0033A0]">Schedule</span>
            </div>
            <div className="space-y-1.5">
              {data.calendar.map((event, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-14 shrink-0 font-medium text-gray-500">{event.time}</span>
                  <div>
                    <span className="text-gray-900">{event.title}</span>
                    {event.location && (
                      <span className="ml-1 text-xs text-gray-400">({event.location})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expected Attention */}
        {data.expectedAttention.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Expected Attention</span>
            </div>
            <div className="space-y-1.5">
              {data.expectedAttention.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      item.urgency === 'red' ? 'bg-red-500' : item.urgency === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                  {item.item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.prepNeeded && (
        <div className="border-t border-gray-100 px-5 py-2.5">
          <span className="text-xs font-semibold text-amber-600">Prep needed — see course checklist below</span>
        </div>
      )}
    </div>
  )
}
