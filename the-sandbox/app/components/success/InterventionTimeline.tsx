'use client'

import { CheckCircle, Clock, AlertTriangle, XCircle, HelpCircle, ArrowUpRight } from 'lucide-react'

const OUTCOME_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-gray-400', label: 'Pending' },
  RE_ENGAGED: { icon: CheckCircle, color: 'text-emerald-500', label: 'Re-engaged' },
  PARTIAL: { icon: ArrowUpRight, color: 'text-amber-500', label: 'Partial' },
  NO_CHANGE: { icon: XCircle, color: 'text-gray-500', label: 'No Change' },
  DECLINED: { icon: XCircle, color: 'text-orange-500', label: 'Declined' },
  ESCALATED: { icon: AlertTriangle, color: 'text-red-500', label: 'Escalated' },
  UNKNOWN: { icon: HelpCircle, color: 'text-gray-400', label: 'Unknown' },
}

interface Intervention {
  id: string
  type: string
  notes: string | null
  outcome: string
  scoreAtIntervention: number | null
  scoreAtOutcome: number | null
  createdAt: string
  initiator?: { name: string }
}

export default function InterventionTimeline({ interventions }: { interventions: Intervention[] }) {
  if (interventions.length === 0) {
    return <p className="text-sm text-gray-500 italic">No interventions recorded yet.</p>
  }

  return (
    <div className="space-y-4">
      {interventions.map((int, i) => {
        const config = OUTCOME_CONFIG[int.outcome] ?? OUTCOME_CONFIG.UNKNOWN
        const Icon = config.icon
        return (
          <div key={int.id} className="relative flex gap-3">
            {i < interventions.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200" />
            )}
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{int.type.replace(/_/g, ' ')}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${config.color} bg-opacity-10`}>
                  {config.label}
                </span>
              </div>
              {int.notes && (
                <p className="text-sm text-gray-600 mt-1">{int.notes}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>{new Date(int.createdAt).toLocaleDateString()}</span>
                {int.initiator && <span>by {int.initiator.name}</span>}
                {int.scoreAtIntervention != null && int.scoreAtOutcome != null && (
                  <span>Score: {int.scoreAtIntervention} → {int.scoreAtOutcome}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
