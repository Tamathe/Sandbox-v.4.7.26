'use client'

import { useMemo, useState } from 'react'

import type { LeagueCycle, LeagueSubmission } from '../types'

export function PredictionMarketView({
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
  const options = useMemo(() => {
    const raw = cycle.stateJson.options
    return Array.isArray(raw) ? raw.map((value) => String(value)) : []
  }, [cycle.stateJson.options])
  const [option, setOption] = useState(String(mySubmission?.payloadJson.option ?? options[0] ?? ''))
  const [stake, setStake] = useState(String(mySubmission?.payloadJson.stake ?? cycle.stateJson.stakeMin ?? 25))
  const [winningOption, setWinningOption] = useState(String(cycle.summaryJson?.winningOption ?? options[0] ?? ''))

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-900">{String(cycle.stateJson.question ?? cycle.label)}</h4>
        {cycle.stateJson.description ? (
          <p className="mt-1 text-sm text-gray-600">{String(cycle.stateJson.description)}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        {options.map((entry) => (
          <label key={entry} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="radio"
              name={`prediction-option-${cycle.id}`}
              checked={option === entry}
              onChange={() => setOption(entry)}
            />
            <span>{entry}</span>
          </label>
        ))}
      </div>

      {cycle.status !== 'RESOLVED' ? (
        <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={stake}
              onChange={(event) => setStake(event.target.value)}
              type="number"
              min={1}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
            />
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => onSubmit({ option, stake: Number(stake) })}
              className="rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mySubmission ? 'Update Bet' : 'Place Bet'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Stake range: {String(cycle.stateJson.stakeMin ?? 25)} to {String(cycle.stateJson.stakeMax ?? 250)} Sand
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Resolved: <strong>{String(cycle.summaryJson?.winningOption ?? 'Unknown')}</strong>
        </div>
      )}

      {isAdmin && cycle.status !== 'RESOLVED' ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#0033A0]">Resolve Market</h5>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={winningOption}
              onChange={(event) => setWinningOption(event.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
            >
              {options.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => onResolve({ winningOption })}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Resolve
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
