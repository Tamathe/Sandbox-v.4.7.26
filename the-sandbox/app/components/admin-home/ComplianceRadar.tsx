'use client'

import { memo } from 'react'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { ComplianceDeadline } from './useAdminHome'

// ─── Urgency color maps ────────────────────────────────────

const BORDER_COLOR: Record<string, string> = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
}

const BADGE_STYLE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
}

// ─── Component ──────────────────────────────────────────────

interface ComplianceRadarProps {
  deadlines: ComplianceDeadline[]
}

const ComplianceRadar = memo(function ComplianceRadar({ deadlines }: ComplianceRadarProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <ShieldAlert className="size-4 text-gray-900" />
        <h2 className="text-base font-extrabold text-gray-900">Compliance Radar</h2>
      </div>

      {/* Deadlines */}
      <div className="divide-y divide-gray-100">
        {deadlines.map((dl) => (
          <div
            key={dl.id}
            className={`px-4 py-3 border-l-4 ${BORDER_COLOR[dl.urgency]} flex items-center gap-3`}
          >
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900">{dl.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">
                  {format(new Date(dl.dueDate + 'T00:00:00'), 'MMM d, yyyy')}
                </span>
                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {dl.category}
                </span>
              </div>
            </div>

            {/* Countdown badge */}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${BADGE_STYLE[dl.urgency]}`}>
              {dl.daysRemaining}d
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <Link href="/admin/compliance-portal" className="text-xs font-semibold text-[#0033A0] hover:underline">
          View Compliance Portal →
        </Link>
      </div>
    </div>
  )
})

export default ComplianceRadar
