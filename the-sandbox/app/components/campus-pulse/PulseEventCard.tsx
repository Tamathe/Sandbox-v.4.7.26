'use client'

import { useState } from 'react'
import {
  Newspaper,
  Mail,
  UserX,
  MessageCircle,
  FileText,
  BookOpen,
  ClipboardList,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import PulseSeverityBadge from './PulseSeverityBadge'
import SignalStrengthBar from './SignalStrengthBar'

const STREAM_ICONS: Record<string, typeof Newspaper> = {
  uknow: Newspaper,
  'email-urgency': Mail,
  'at-risk': UserX,
  sentiment: MessageCircle,
  policy: FileText,
  'office-hours': BookOpen,
  'course-posts': ClipboardList,
  submissions: ClipboardList,
}

const STREAM_LABELS: Record<string, string> = {
  uknow: 'Campus News',
  'email-urgency': 'Email Urgency',
  'at-risk': 'Student At-Risk',
  sentiment: 'Social Sentiment',
  policy: 'Policy Change',
  'office-hours': 'Office Hours',
  'course-posts': 'Course Posts',
  submissions: 'Submissions',
}

interface PulseSignal {
  id: string
  stream: string
  evidence: string
  dataPoints: number
  strength: number
  firstSeen: string
  lastSeen: string
}

interface PulseEvent {
  id: string
  theme: string
  severity: string
  status: string
  summary: string
  suggestedActions: string[]
  signals: PulseSignal[]
  detectedAt: string
  acknowledgedBy?: string | null
  resolvedAt?: string | null
  resolvedNote?: string | null
}

interface PulseEventCardProps {
  event: PulseEvent
  onAcknowledge?: (eventId: string) => void
  onResolve?: (eventId: string, note: string) => void
  isAdmin?: boolean
}

export default function PulseEventCard({
  event,
  onAcknowledge,
  onResolve,
  isAdmin,
}: PulseEventCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [showResolve, setShowResolve] = useState(false)

  const detectedAgo = formatTimeAgo(event.detectedAt)
  const isActive = event.status === 'active'
  const isAcknowledged = event.status === 'acknowledged'

  return (
    <div className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PulseSeverityBadge severity={event.severity} />
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="size-3" />
              {detectedAgo}
            </span>
            <span className="text-xs text-gray-400">
              {event.signals.length} signal{event.signals.length !== 1 ? 's' : ''}
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 mt-1 truncate">
            {event.theme}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{event.summary}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          {/* Signals */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Converging Signals</h4>
            <div className="space-y-2">
              {event.signals.map(signal => {
                const Icon = STREAM_ICONS[signal.stream] || Newspaper
                const label = STREAM_LABELS[signal.stream] || signal.stream
                return (
                  <div key={signal.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="shrink-0 mt-0.5">
                      <Icon className="size-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">{label}</span>
                        <span className="text-xs text-gray-400">{signal.dataPoints} data points</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{signal.evidence}</p>
                      <div className="mt-1.5 max-w-48">
                        <SignalStrengthBar strength={signal.strength} stream={signal.stream} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Suggested actions */}
          {event.suggestedActions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggested Actions</h4>
              <ul className="space-y-1">
                {event.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-[#0033A0] mt-0.5">&#x2022;</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {(isActive || isAcknowledged) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {isActive && onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(event.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0033A0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="size-4" />
                  Acknowledge
                </button>
              )}
              {isAdmin && (isActive || isAcknowledged) && !showResolve && (
                <button
                  onClick={() => setShowResolve(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle className="size-4" />
                  Resolve
                </button>
              )}
              {showResolve && onResolve && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={resolveNote}
                    onChange={e => setResolveNote(e.target.value)}
                    placeholder="Resolution note..."
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20"
                  />
                  <button
                    onClick={() => {
                      onResolve(event.id, resolveNote)
                      setShowResolve(false)
                      setResolveNote('')
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowResolve(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolved note */}
          {event.status === 'resolved' && event.resolvedNote && (
            <div className="text-sm text-gray-500 italic">
              Resolved: {event.resolvedNote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
