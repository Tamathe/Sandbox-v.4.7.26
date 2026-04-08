'use client'

import { AlertTriangle, Clock, User, CheckCircle } from 'lucide-react'

interface GapDetailCardProps {
  gap: {
    title: string
    description: string
    severity: string
    estimatedEffort: string | null
    assignedTo: string | null
    remediationStatus: string
    suggestedActions: { action: string; responsible: string }[]
    missingEvidenceTypes: string[]
    affectedPrograms: string[]
  }
}

const severityStyle: Record<string, { border: string; badge: string }> = {
  critical: { border: 'border-red-300', badge: 'bg-red-100 text-red-800' },
  major: { border: 'border-orange-300', badge: 'bg-orange-100 text-orange-800' },
  minor: { border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-800' },
  informational: { border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800' },
}

export default function GapDetailCard({ gap }: GapDetailCardProps) {
  const style = severityStyle[gap.severity] ?? severityStyle.informational

  return (
    <div className={`border-2 ${style.border} rounded-2xl p-5 bg-white`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-extrabold text-gray-900">{gap.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{gap.description}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
          {gap.severity}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {gap.estimatedEffort && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="size-3" />
            <span>Effort: {gap.estimatedEffort}</span>
          </div>
        )}
        {gap.assignedTo && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="size-3" />
            <span>{gap.assignedTo}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircle className="size-3" />
          <span>{gap.remediationStatus}</span>
        </div>
      </div>

      {gap.suggestedActions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Suggested Actions</h4>
          <ul className="space-y-1.5">
            {gap.suggestedActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="shrink-0 mt-1 size-1.5 rounded-full bg-gray-400" />
                <span>{a.action} <span className="text-gray-400">({a.responsible})</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gap.missingEvidenceTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gap.missingEvidenceTypes.map(t => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {t.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
