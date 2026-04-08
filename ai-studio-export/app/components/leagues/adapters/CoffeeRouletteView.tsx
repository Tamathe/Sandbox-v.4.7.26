'use client'

import { useMemo, useState } from 'react'

import type { LeagueCycle, LeagueSubmission, LeagueMember } from '../types'

export function CoffeeRouletteView({
  cycle,
  mySubmission,
  members,
  isAdmin,
  actionBusy,
  onSubmit,
  onResolve,
}: {
  cycle: LeagueCycle
  mySubmission: LeagueSubmission | null
  members: LeagueMember[]
  isAdmin: boolean
  actionBusy: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  onResolve: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [notes, setNotes] = useState(String(mySubmission?.payloadJson.notes ?? ''))
  const [completed, setCompleted] = useState(Boolean(mySubmission?.payloadJson.completed))
  const pairings = useMemo(() => {
    const raw = cycle.stateJson.pairings
    return Array.isArray(raw) ? raw.map((value) => value as Record<string, unknown>) : []
  }, [cycle.stateJson.pairings])

  const myPair = pairings.find((pairing) => {
    const memberAId = String(pairing.memberAId ?? '')
    const memberBId = pairing.memberBId ? String(pairing.memberBId) : null
    return members.some((member) => member.id === memberAId && member.userId === mySubmission?.userId)
      || members.some((member) => member.id === memberBId && member.userId === mySubmission?.userId)
  })

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-900">{cycle.label}</h4>
        <p className="mt-1 text-sm text-gray-600">
          {String(cycle.stateJson.prompt ?? 'Meet someone new and log the connection.')}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <div className="font-semibold text-gray-900">This week&apos;s pairings</div>
        <div className="mt-2 space-y-2">
          {pairings.length === 0 ? (
            <p>No pairings yet. Invite more members or open the next round.</p>
          ) : (
            pairings.map((pairing, index) => (
              <p key={`${pairing.memberAId}-${pairing.memberBId}-${index}`}>
                {String(pairing.memberAName ?? 'Member')} + {String(pairing.memberBName ?? 'Solo reflection')}
              </p>
            ))
          )}
        </div>
      </div>

      {cycle.status !== 'RESOLVED' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          {myPair ? (
            <p className="mb-3 text-sm text-gray-600">
              Your pairing: <strong>{String(myPair.memberAName ?? '')}</strong>
              {myPair.memberBName ? <> and <strong>{String(myPair.memberBName)}</strong></> : null}
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />
            We actually met this week
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="One line about how it went"
            className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
          />
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => onSubmit({ completed, notes })}
            className="mt-3 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Log Connection
          </button>
        </div>
      ) : null}

      {isAdmin && cycle.status !== 'RESOLVED' ? (
        <button
          type="button"
          disabled={actionBusy}
          onClick={() => onResolve({})}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Close Week
        </button>
      ) : null}
    </div>
  )
}
