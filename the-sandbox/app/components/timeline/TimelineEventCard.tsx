'use client'

import {
  Brain,
  ArrowRightLeft,
  Flame,
  Target,
  BookOpen,
  Lightbulb,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

const TYPE_ICONS: Record<string, typeof Brain> = {
  mastery_jump: Brain,
  transfer: ArrowRightLeft,
  session: Flame,
  bloom_advance: Target,
  study_plan: BookOpen,
  misconception_cleared: Lightbulb,
}

const TYPE_COLORS: Record<string, string> = {
  mastery_jump: 'text-purple-600 bg-purple-50',
  transfer: 'text-green-600 bg-green-50',
  session: 'text-orange-600 bg-orange-50',
  bloom_advance: 'text-blue-600 bg-blue-50',
  study_plan: 'text-gray-600 bg-gray-50',
  misconception_cleared: 'text-yellow-600 bg-yellow-50',
}

const MAGNITUDE_BORDER: Record<string, string> = {
  breakthrough: 'border-l-4 border-l-yellow-500 bg-yellow-50/30',
  notable: 'border-l-4 border-l-[#0033A0]',
  minor: 'border-l-4 border-l-gray-300',
}

const MAGNITUDE_PILL: Record<string, string> = {
  breakthrough: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  notable: 'bg-blue-100 text-blue-800 border-blue-200',
  minor: 'bg-gray-100 text-gray-600 border-gray-200',
}

interface TimelineEventCardProps {
  event: TimelineEvent
  compact?: boolean
}

export default function TimelineEventCard({ event, compact }: TimelineEventCardProps) {
  const Icon = TYPE_ICONS[event.type] ?? Flame
  const iconStyle = TYPE_COLORS[event.type] ?? 'text-gray-500 bg-gray-50'
  const borderStyle = MAGNITUDE_BORDER[event.magnitude] ?? MAGNITUDE_BORDER.minor

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className={`size-6 rounded-lg flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
          <Icon className="size-3" />
        </div>
        <span className="text-sm text-gray-900 font-medium truncate flex-1">{event.title}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
        </span>
      </div>
    )
  }

  const concepts = (event.metadata.conceptsTouched as string[] | undefined) ??
    (event.metadata.concept ? [event.metadata.concept as string] : [])

  return (
    <div className={`bg-white rounded-2xl border-2 border-gray-200 p-4 ${borderStyle} transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        {/* Left: icon */}
        <div className={`size-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
          <Icon className="size-4" />
        </div>

        {/* Center: content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{event.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.description}</p>

          {/* Concept tags */}
          {concepts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {concepts.slice(0, 5).map((concept) => (
                <span
                  key={concept}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${MAGNITUDE_PILL[event.magnitude]}`}
                >
                  {concept}
                </span>
              ))}
            </div>
          )}

          {/* Course badge */}
          {event.courseCode && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-[#0033A0] bg-blue-50 px-2 py-0.5 rounded-full">
              {event.courseCode}
            </span>
          )}
        </div>

        {/* Right: timestamp */}
        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
