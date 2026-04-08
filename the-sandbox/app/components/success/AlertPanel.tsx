'use client'

import { X } from 'lucide-react'
import SeverityBadge from './SeverityBadge'
import SignalBreakdown from './SignalBreakdown'
import InterventionForm from './InterventionForm'
import InterventionTimeline from './InterventionTimeline'

interface Alert {
  id: string
  severity: string
  status: string
  triggerReason: string
  patternType: string | null
  signalBreakdown: { signal: string; score: number; delta: number; detail: string }[]
  suggestedActions: { action: string; reason: string; urgency: string; type: string }[]
  user: { id: string; name: string; email: string }
  interventions: {
    id: string
    type: string
    notes: string | null
    outcome: string
    scoreAtIntervention: number | null
    scoreAtOutcome: number | null
    createdAt: string
    initiator?: { name: string }
  }[]
  createdAt: string
}

interface Props {
  alert: Alert
  onClose: () => void
  onRefresh: () => void
}

export default function AlertPanel({ alert, onClose, onRefresh }: Props) {
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl border-l z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={alert.severity} />
          <h2 className="font-extrabold text-lg">{alert.user.name}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <X className="size-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Trigger reason */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">What Triggered This Alert</h3>
          <p className="text-sm text-gray-600">{alert.triggerReason}</p>
          {alert.patternType && (
            <span className="mt-2 inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              Pattern: {alert.patternType.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Signal breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Signal Breakdown</h3>
          <SignalBreakdown signals={alert.signalBreakdown} />
        </div>

        {/* Suggested actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Suggested Actions</h3>
          <div className="space-y-2">
            {(alert.suggestedActions as { action: string; reason: string; urgency: string; type: string }[]).map((sa, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    sa.urgency === 'immediate' ? 'bg-red-50 text-red-700' :
                    sa.urgency === 'this_week' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {sa.urgency.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">{sa.type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm font-medium">{sa.action}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sa.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Record intervention */}
        {alert.status !== 'resolved' && alert.status !== 'dismissed' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Record an Intervention</h3>
            <InterventionForm alertId={alert.id} onSubmit={onRefresh} />
          </div>
        )}

        {/* Intervention history */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Intervention History</h3>
          <InterventionTimeline interventions={alert.interventions} />
        </div>
      </div>
    </div>
  )
}
