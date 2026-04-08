'use client'

import { useMemo, useState } from 'react'

import type { LeagueCycle, LeagueSubmission } from '../types'

export function SurvivorPoolView({
  cycle,
  mySubmission,
  isAdmin,
  actionBusy,
  onSubmit,
  onResolve,
}: {
  cycle: LeagueCycle
  mySubmission: LeagueSubmission | null
  isAdmin: boolean
  actionBusy: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  onResolve: (payload: Record<string, unknown>) => Promise<void>
}) {
  const teams = useMemo(() => {
    const raw = cycle.stateJson.availableTeams
    return Array.isArray(raw) ? raw.map((value) => String(value)) : []
  }, [cycle.stateJson.availableTeams])
  const [pick, setPick] = useState(String(mySubmission?.payloadJson.pick ?? teams[0] ?? ''))
  const [winningTeams, setWinningTeams] = useState('')

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-900">{cycle.label}</h4>
        <p className="mt-1 text-sm text-gray-600">One pick. No repeats. Stay alive.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {teams.map((team) => (
          <label key={team} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="radio"
              name={`survivor-pick-${cycle.id}`}
              checked={pick === team}
              onChange={() => setPick(team)}
            />
            <span>{team}</span>
          </label>
        ))}
      </div>

      {cycle.status !== 'RESOLVED' ? (
        <button
          type="button"
          disabled={actionBusy}
          onClick={() => onSubmit({ pick })}
          className="rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mySubmission ? 'Update Pick' : 'Lock Pick'}
        </button>
      ) : (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Week resolved. Winning teams:
          <strong className="ml-1">
            {Array.isArray(cycle.summaryJson?.winningTeams)
              ? cycle.summaryJson?.winningTeams.map((value) => String(value)).join(', ')
              : 'Recorded'}
          </strong>
        </div>
      )}

      {isAdmin && cycle.status !== 'RESOLVED' ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#0033A0]">Resolve Week</h5>
          <textarea
            value={winningTeams}
            onChange={(event) => setWinningTeams(event.target.value)}
            rows={4}
            placeholder="Winning teams, one per line"
            className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
          />
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => onResolve({ winningTeams })}
            className="mt-3 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resolve Week
          </button>
        </div>
      ) : null}
    </div>
  )
}
