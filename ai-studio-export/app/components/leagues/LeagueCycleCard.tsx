'use client'

import type { LeagueCycle, LeagueDetail } from './types'
import { LeagueSubmissionPanel } from './LeagueSubmissionPanel'

export function LeagueCycleCard({
  league,
  cycle,
  actionBusy,
  onSubmit,
  onResolve,
}: {
  league: LeagueDetail
  cycle: LeagueCycle
  actionBusy: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  onResolve: (payload: Record<string, unknown>) => Promise<void>
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{cycle.label}</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0033A0]">
              {cycle.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Opens {new Date(cycle.opensAt).toLocaleString()} • Closes {new Date(cycle.closesAt).toLocaleString()}
          </p>
        </div>
        <div className="text-xs text-gray-500">
          {cycle.submissions.length} submission{cycle.submissions.length === 1 ? '' : 's'}
        </div>
      </div>

      <LeagueSubmissionPanel
        league={league}
        cycle={cycle}
        actionBusy={actionBusy}
        onSubmit={onSubmit}
        onResolve={onResolve}
      />
    </div>
  )
}
