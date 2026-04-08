'use client'

import { memo } from 'react'
import { ListChecks } from 'lucide-react'
import Link from 'next/link'
import type { AdminAction } from './useAdminHome'

// ─── Priority colors ───────────────────────────────────────

const PRIORITY_STYLE: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-amber-100 text-amber-700',
  P2: 'bg-blue-100 text-blue-700',
  P3: 'bg-gray-100 text-gray-500',
}

// ─── Quick-action button colors ────────────────────────────

const ACTION_STYLE: Record<string, string> = {
  approve: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  review: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  acknowledge: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
}

// ─── Component ──────────────────────────────────────────────

interface ActionPriorityQueueProps {
  actions: AdminAction[]
}

const ActionPriorityQueue = memo(function ActionPriorityQueue({ actions }: ActionPriorityQueueProps) {
  const visible = actions.slice(0, 8)

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <ListChecks className="size-4 text-gray-900" />
        <h2 className="text-base font-extrabold text-gray-900">Action Priority Queue</h2>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {visible.map((action) => (
          <div key={action.id} className="px-4 py-3 flex items-start gap-3">
            {/* Priority pill */}
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${PRIORITY_STYLE[action.priority]}`}>
              {action.priority}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{action.title}</div>
              <div className="text-xs text-gray-400 truncate">{action.description}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {action.source}
                </span>
                <span className="text-xs text-gray-400">{action.timestamp}</span>
              </div>
            </div>

            {/* Quick-action button */}
            {action.quickAction && (
              <button
                type="button"
                className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 transition-colors ${ACTION_STYLE[action.quickAction.action]}`}
              >
                {action.quickAction.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <Link href="/admin" className="text-xs font-semibold text-[#0033A0] hover:underline">
          View all in Control Tower →
        </Link>
      </div>
    </div>
  )
})

export default ActionPriorityQueue
