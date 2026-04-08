'use client'

import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface Impact {
  id: string
  impactType: string
  targetId: string
  targetLabel: string
  description: string
  severity: string
  actionNeeded: string | null
}

interface ImpactListProps {
  impacts: Impact[]
}

const severityOrder: Record<string, number> = {
  conflict: 0,
  'action-required': 1,
  info: 2,
}

const severityConfig: Record<string, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  conflict: {
    label: 'Conflicts',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: AlertTriangle,
  },
  'action-required': {
    label: 'Action Required',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: AlertCircle,
  },
  info: {
    label: 'Informational',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Info,
  },
}

export default function ImpactList({ impacts }: ImpactListProps) {
  if (impacts.length === 0) {
    return (
      <div className="border rounded-2xl shadow-sm bg-white p-6 text-center text-gray-500">
        No impacts detected.
      </div>
    )
  }

  // Group by severity
  const grouped = impacts.reduce<Record<string, Impact[]>>((acc, imp) => {
    const key = imp.severity
    if (!acc[key]) acc[key] = []
    acc[key].push(imp)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => (severityOrder[a] ?? 99) - (severityOrder[b] ?? 99),
  )

  return (
    <div className="space-y-4">
      {sortedGroups.map(([severity, items]) => {
        const config = severityConfig[severity] ?? severityConfig.info
        const Icon = config.icon
        return (
          <div key={severity} className={`border rounded-2xl shadow-sm ${config.bg} p-4`}>
            <h3 className={`text-sm font-extrabold uppercase tracking-wide ${config.color} flex items-center gap-2 mb-3`}>
              <Icon className="size-4" />
              {config.label} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/80 border border-white/60 rounded-xl p-3"
                >
                  <p className="text-sm font-semibold text-gray-900">{item.targetLabel}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                  {item.actionNeeded && (
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Action:</span> {item.actionNeeded}
                    </p>
                  )}
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {item.impactType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
