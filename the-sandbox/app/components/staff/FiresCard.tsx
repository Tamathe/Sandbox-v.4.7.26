'use client'

import { Flame } from 'lucide-react'
import { ActionItem } from './StaffHomepage'
import { StaffAlert } from './AlertsCard'

interface FiresCardProps {
  p0Actions: ActionItem[]
  criticalAlerts: StaffAlert[]
  onResolveAction: (id: string) => void
  onDismissAlert: (id: string) => void
}

function getAge(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function FiresCard({ p0Actions, criticalAlerts, onResolveAction, onDismissAlert }: FiresCardProps) {
  const totalCount = p0Actions.length + criticalAlerts.length
  if (totalCount === 0) return null

  return (
    <div data-card="fires" className="border rounded-2xl shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 rounded-t-2xl px-4 py-3 flex items-center gap-2">
        <Flame className="text-red-600 size-4" />
        <h3 className="text-sm font-extrabold text-red-900">Needs Attention</h3>
        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          {totalCount}
        </span>
      </div>

      {/* Items list */}
      <div className="px-4 py-3 space-y-2">
        {p0Actions.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">
              P0
            </span>
            <span className="text-sm text-gray-800 flex-1 truncate">{item.title}</span>
            <span className="text-[11px] text-gray-400 shrink-0">{getAge(item.createdAt)}</span>
            <button
              onClick={() => onResolveAction(item.id)}
              className="text-xs font-medium px-2 py-1 rounded-lg transition-colors shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              Resolve
            </button>
          </div>
        ))}
        {criticalAlerts.map(alert => (
          <div key={alert.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Alert
            </span>
            <span className="text-sm text-gray-800 flex-1 truncate">{alert.title}</span>
            <span className="text-[11px] text-gray-400 shrink-0">
              {alert.expiresAt ? getAge(alert.expiresAt) : ''}
            </span>
            <button
              onClick={() => onDismissAlert(alert.id)}
              className="text-xs font-medium px-2 py-1 rounded-lg transition-colors shrink-0 bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
