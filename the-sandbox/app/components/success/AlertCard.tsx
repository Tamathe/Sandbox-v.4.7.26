'use client'

import { useState } from 'react'
import { Check, MessageSquare, X } from 'lucide-react'
import SeverityBadge from './SeverityBadge'

interface Alert {
  id: string
  severity: string
  status: string
  triggerReason: string
  patternType: string | null
  routeTarget: string
  user: { id: string; name: string; email: string }
  createdAt: string
  suggestedActions: { action: string; reason: string; urgency: string }[]
}

interface Props {
  alert: Alert
  onAcknowledge: (id: string) => void
  onAct: (id: string) => void
  onDismiss: (id: string) => void
}

export default function AlertCard({ alert, onAcknowledge, onAct, onDismiss }: Props) {
  const [dismissing, setDismissing] = useState(false)

  return (
    <div className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={alert.severity} />
            <span className="text-sm font-semibold">{alert.user.name}</span>
            {alert.patternType && (
              <span className="text-xs text-gray-400">
                {alert.patternType.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{alert.triggerReason}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(alert.createdAt).toLocaleDateString()} · Route: {alert.routeTarget}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {alert.status === 'active' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
              title="Acknowledge"
            >
              <Check className="size-4" />
            </button>
          )}
          <button
            onClick={() => onAct(alert.id)}
            className="p-1.5 text-gray-400 hover:text-[#0033A0] hover:bg-blue-50 rounded-lg"
            title="Take Action"
          >
            <MessageSquare className="size-4" />
          </button>
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {alert.suggestedActions.length > 0 && (
        <div className="mt-3 space-y-1">
          {(alert.suggestedActions as { action: string; reason: string; urgency: string }[]).slice(0, 2).map((sa, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded font-medium ${
                sa.urgency === 'immediate' ? 'bg-red-50 text-red-700' :
                sa.urgency === 'this_week' ? 'bg-amber-50 text-amber-700' :
                'bg-gray-50 text-gray-600'
              }`}>
                {sa.urgency.replace('_', ' ')}
              </span>
              <span className="text-gray-600">{sa.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
