'use client'

import { Sunrise, Clock, Pin, Footprints, ArrowRight, Sparkles } from 'lucide-react'
import type { TomorrowPreviewData } from '../../lib/student-home-data'

const URGENCY_STYLES: Record<string, string> = {
  critical: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
}

interface TomorrowPreviewProps {
  data: TomorrowPreviewData
}

export default function TomorrowPreview({ data }: TomorrowPreviewProps) {
  const { dayLabel, classes, suggestedDeparture, deadlines, prepHints } = data

  const prepHintMap = new Map(prepHints.map(p => [p.courseCode, p.hint]))

  function handlePrepWithSandy() {
    const classesText = classes.map(c => `${c.courseCode} at ${c.time}`).join(', ')
    const deadlinesText = deadlines.map(d => `${d.title} (${d.courseCode}) ${d.dueLabel}`).join(', ')
    const message = `Help me prepare for tomorrow. I have: ${classesText || 'no classes'}.${deadlinesText ? ` Deadlines: ${deadlinesText}.` : ''} What should I focus on tonight?`
    window.dispatchEvent(new CustomEvent('sandy-prefill', {
      detail: { message, autoSend: true },
    }))
  }

  return (
    <div className="bg-gradient-to-b from-white to-slate-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Sunrise className="size-4 text-amber-500" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Tomorrow · {dayLabel}
        </h3>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Schedule */}
        {classes.length > 0 ? (
          <div className="space-y-1">
            {classes.map((cls, i) => (
              <div key={i}>
                {/* Walking indicator between classes */}
                {cls.walkingMinutes && cls.walkingMinutes > 5 && (
                  <div className="flex items-center gap-1.5 pl-[72px] py-0.5">
                    <Footprints className="size-3 text-gray-300" />
                    <span className="text-[10px] text-gray-400">{cls.walkingMinutes}-min walk</span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="text-sm font-semibold text-gray-500 w-[68px] flex-shrink-0 text-right tabular-nums">
                    {cls.time}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{cls.courseCode}</span>
                      <span className="text-sm text-gray-600 truncate">{cls.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{cls.location}</span>
                    {/* Prep hint annotation */}
                    {prepHintMap.has(cls.courseCode) && (
                      <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                        {prepHintMap.get(cls.courseCode)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No classes tomorrow</p>
        )}

        {/* Suggested departure */}
        {suggestedDeparture && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100">
            <Clock className="size-3.5 text-slate-500" />
            <span className="text-sm text-slate-600">
              Suggested departure: <span className="font-semibold">{suggestedDeparture}</span>
            </span>
          </div>
        )}

        {/* Deadlines */}
        {deadlines.length > 0 && (
          <div className="space-y-1.5">
            {deadlines.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <Pin className={`size-3.5 mt-0.5 flex-shrink-0 ${URGENCY_STYLES[d.urgency] || 'text-gray-500'}`} />
                <p className="text-sm">
                  <span className="font-semibold text-gray-800">{d.title}</span>
                  <span className="text-gray-500"> ({d.courseCode})</span>
                  <span className={`ml-1 font-medium ${URGENCY_STYLES[d.urgency] || 'text-gray-500'}`}> — {d.dueLabel}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Prep with Sandy */}
        <button
          type="button"
          onClick={handlePrepWithSandy}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:text-blue-700 transition-colors"
        >
          <Sparkles className="size-3.5" />
          Prep with Sandy
          <ArrowRight className="size-3" />
        </button>
      </div>
    </div>
  )
}
