'use client'

import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import PulseSeverityBadge from './PulseSeverityBadge'

interface TimelineEvent {
  id: string
  theme: string
  severity: string
  status: string
  detectedAt: string
  resolvedAt?: string | null
}

interface PulseTimelineProps {
  events: TimelineEvent[]
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  active: AlertTriangle,
  acknowledged: Clock,
  resolved: CheckCircle,
  'false-alarm': XCircle,
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-orange-500',
  acknowledged: 'text-blue-500',
  resolved: 'text-emerald-500',
  'false-alarm': 'text-gray-400',
}

export default function PulseTimeline({ events }: PulseTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No events to display
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const Icon = STATUS_ICONS[event.status] || Clock
        const color = STATUS_COLORS[event.status] || 'text-gray-400'
        const isLast = idx === events.length - 1

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`shrink-0 ${color}`}>
                <Icon className="size-5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {event.theme}
                </span>
                <PulseSeverityBadge severity={event.severity} size="sm" />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Detected {formatDate(event.detectedAt)}
                {event.status === 'resolved' && event.resolvedAt && (
                  <> &middot; Resolved {formatDate(event.resolvedAt)}</>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
