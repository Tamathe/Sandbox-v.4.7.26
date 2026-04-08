'use client'

import Link from 'next/link'
import { Clock, MessageSquare } from 'lucide-react'
import type { TimelineMilestone } from '../../lib/uknow-insights-service'

interface TimelineStoryProps {
  narrative: string
  milestones: TimelineMilestone[]
  followUps: string[]
  onFollowUp: (q: string) => void
}

export function TimelineStory({ narrative, milestones, followUps, onFollowUp }: TimelineStoryProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Narrative */}
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
        <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{narrative}</p>
      </div>

      {/* Timeline */}
      {milestones.length > 0 && (
        <div className="border-2 border-blue-200 rounded-2xl bg-blue-50/30 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#0033A0] mb-4 flex items-center gap-1.5">
            <Clock className="size-3.5" />
            Timeline
          </h4>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-blue-200" />

            <div className="flex flex-col gap-4">
              {milestones.map((m, i) => {
                const formattedDate = formatMilestoneDate(m.date)
                return (
                  <div key={i} className="relative flex gap-3 pl-0">
                    {/* Dot */}
                    <div className="relative z-10 mt-1.5">
                      <div className="size-4 rounded-full bg-[#0033A0] border-2 border-white shadow-sm" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        {formattedDate}
                      </p>
                      {m.slug ? (
                        <Link
                          href={`/uknow/${m.slug}`}
                          className="text-sm font-bold text-gray-900 hover:text-[#0033A0] leading-snug block mt-0.5"
                        >
                          {m.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-gray-900 leading-snug mt-0.5">
                          {m.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{m.excerpt}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Follow-up chips */}
      {followUps.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {followUps.map((fu) => (
            <button
              key={fu}
              onClick={() => onFollowUp(fu)}
              className="px-3 py-1.5 text-sm bg-white text-[#0033A0] border border-blue-100 rounded-full hover:bg-blue-50 transition-colors"
            >
              <MessageSquare className="size-3 inline mr-1.5" />
              {fu}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatMilestoneDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}
