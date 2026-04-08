'use client'

import { useState } from 'react'
import {
  Clock, BookOpen, Utensils, Footprints, RotateCcw, Pencil, Pause,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'
import type { GapPlan, GapActivity } from '../../lib/student-home/gap-planner'

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  utensils: Utensils,
  footprints: Footprints,
  'rotate-ccw': RotateCcw,
  pencil: Pencil,
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}m`
}

function ActivityRow({ activity, onAction }: { activity: GapActivity; onAction?: (activity: GapActivity) => void }) {
  const Icon = ACTIVITY_ICONS[activity.icon] || BookOpen
  const isActionable = activity.actionType || activity.actionHref

  return (
    <div className="flex items-start gap-2.5 py-1">
      <Icon className="size-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700 truncate">{activity.label}</p>
          <span className="text-[10px] text-gray-400 font-medium flex-shrink-0 tabular-nums">
            {activity.durationMinutes}m
          </span>
        </div>
        <p className="text-[10px] text-gray-400 truncate">{activity.sublabel}</p>
      </div>
      {isActionable && onAction && (
        <button
          type="button"
          onClick={() => onAction(activity)}
          className="text-[10px] font-semibold text-[#0033A0] hover:text-blue-700 flex items-center gap-0.5 flex-shrink-0 mt-0.5"
        >
          Start <ArrowRight className="size-2.5" />
        </button>
      )}
    </div>
  )
}

interface GapPlanCardProps {
  plan: GapPlan
  onFlashcardReview?: () => void
}

export default function GapPlanCard({ plan, onFlashcardReview }: GapPlanCardProps) {
  const { gap, activities, bufferMinutes } = plan
  const isShort = gap.durationMinutes < 45
  const isLong = gap.durationMinutes > 120
  const [expanded, setExpanded] = useState(isLong)

  function handleAction(activity: GapActivity) {
    if (activity.actionType === 'flashcard-review') {
      onFlashcardReview?.()
    } else if (activity.actionType === 'sandy-message' && activity.actionHref) {
      window.dispatchEvent(new CustomEvent('sandy-prefill', {
        detail: { message: activity.actionHref, autoSend: true },
      }))
    }
  }

  // Short gaps: single-line summary
  if (isShort) {
    const summary = activities
      .filter(a => a.type !== 'walk')
      .map(a => `${a.label} (${a.durationMinutes}m)`)
      .join(' + ')
    const walkActivity = activities.find(a => a.type === 'walk')

    return (
      <div className="flex items-center gap-2 py-1.5 ml-14">
        <div className="w-0.5 h-4 bg-gray-100 ml-[5px]" />
        <div className="flex items-center gap-1.5 text-[10px]">
          <Clock className="size-2.5 text-gray-300" />
          <span className="text-gray-400 font-medium">
            {formatDuration(gap.durationMinutes)} free
          </span>
          <span className="text-gray-300">—</span>
          <span className="text-gray-500">
            {summary}{walkActivity ? ` + walk (${walkActivity.durationMinutes - 5}m)` : ''}
          </span>
        </div>
      </div>
    )
  }

  // Medium/long gaps: card with activities
  const displayActivities = expanded ? activities : activities.slice(0, 2)

  return (
    <div className="my-1.5 ml-14">
      <div className="border border-dashed border-gray-200 rounded-xl bg-slate-50/50 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-100/50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">
              {formatDuration(gap.durationMinutes)} FREE
            </span>
          </div>
          {!isLong && (
            expanded
              ? <ChevronUp className="size-3 text-gray-300" />
              : <ChevronDown className="size-3 text-gray-300" />
          )}
        </button>

        {/* Activities */}
        <div className="px-3 pb-2.5">
          {displayActivities.map((activity, i) => (
            <ActivityRow
              key={i}
              activity={activity}
              onAction={handleAction}
            />
          ))}

          {/* Buffer time */}
          {expanded && bufferMinutes > 10 && (
            <div className="flex items-center gap-2 py-1 mt-0.5">
              <Pause className="size-3 text-gray-300 flex-shrink-0" />
              <span className="text-[10px] text-gray-400">{bufferMinutes} min buffer</span>
            </div>
          )}

          {/* Expand toggle for medium gaps */}
          {!expanded && activities.length > 2 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[10px] text-[#0033A0] font-medium mt-1 hover:underline"
            >
              +{activities.length - 2} more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
