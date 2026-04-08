'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import type { SupportedLeagueKind } from './types'

function toLocalInputValue(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function toIsoString(value: string) {
  return value ? new Date(value).toISOString() : null
}

export function LeagueCreateModal({
  kind,
  mode,
  onClose,
  onSubmit,
  busy,
}: {
  kind: SupportedLeagueKind
  mode: 'league' | 'cycle'
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  busy: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emailForDigest, setEmailForDigest] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState('Yes\nNo')
  const [stakeMin, setStakeMin] = useState('25')
  const [stakeMax, setStakeMax] = useState('250')
  const [closesAt, setClosesAt] = useState(toLocalInputValue(6))
  const [seasonName, setSeasonName] = useState('Fall Survivor Pool')
  const [weekLabel, setWeekLabel] = useState('Week 1')
  const [availableTeams, setAvailableTeams] = useState('Kentucky\nDuke\nKansas\nUConn')
  const [prompt, setPrompt] = useState('Ask one question that gets beyond small talk.')
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    if (mode === 'cycle') return 'Open Next Cycle'
    if (kind === 'PREDICTION_MARKET') return 'Create Prediction Market'
    if (kind === 'SURVIVOR_POOL') return 'Create Survivor Pool'
    return 'Create Coffee Roulette'
  }, [kind, mode])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      if (kind === 'PREDICTION_MARKET') {
        await onSubmit(
          mode === 'league'
            ? {
                name,
                description,
                emailForDigest,
                config: {
                  question,
                  options,
                  closesAt: toIsoString(closesAt),
                  stakeMin: Number(stakeMin),
                  stakeMax: Number(stakeMax),
                },
              }
            : {
                question,
                options,
                closesAt: toIsoString(closesAt),
                stakeMin: Number(stakeMin),
                stakeMax: Number(stakeMax),
              }
        )
      } else if (kind === 'SURVIVOR_POOL') {
        await onSubmit(
          mode === 'league'
            ? {
                name,
                description,
                emailForDigest,
                config: {
                  seasonName,
                  weekLabel,
                  availableTeams,
                  closesAt: toIsoString(closesAt),
                },
              }
            : {
                weekLabel,
                availableTeams,
                closesAt: toIsoString(closesAt),
              }
        )
      } else {
        await onSubmit(
          mode === 'league'
            ? {
                name,
                description,
                emailForDigest,
                config: {
                  prompt,
                  closesAt: toIsoString(closesAt),
                },
              }
            : {
                weekLabel,
                prompt,
                closesAt: toIsoString(closesAt),
              }
        )
      }

      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not save')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">Everything here feeds the same reusable league engine.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {mode === 'league' ? (
            <>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="League name"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                required
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="What makes this league fun?"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
              />
              <input
                value={emailForDigest}
                onChange={(event) => setEmailForDigest(event.target.value)}
                type="email"
                placeholder="Digest email (optional)"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
              />
            </>
          ) : null}

          {kind === 'PREDICTION_MARKET' ? (
            <>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                placeholder="Question"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                required
              />
              <textarea
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                rows={4}
                placeholder="One option per line"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                required
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={stakeMin}
                  onChange={(event) => setStakeMin(event.target.value)}
                  type="number"
                  min={1}
                  placeholder="Min stake"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
                <input
                  value={stakeMax}
                  onChange={(event) => setStakeMax(event.target.value)}
                  type="number"
                  min={1}
                  placeholder="Max stake"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
                <input
                  value={closesAt}
                  onChange={(event) => setClosesAt(event.target.value)}
                  type="datetime-local"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
              </div>
            </>
          ) : null}

          {kind === 'SURVIVOR_POOL' ? (
            <>
              {mode === 'league' ? (
                <input
                  value={seasonName}
                  onChange={(event) => setSeasonName(event.target.value)}
                  placeholder="Season name"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={weekLabel}
                  onChange={(event) => setWeekLabel(event.target.value)}
                  placeholder="Week label"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
                <input
                  value={closesAt}
                  onChange={(event) => setClosesAt(event.target.value)}
                  type="datetime-local"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
              </div>
              <textarea
                value={availableTeams}
                onChange={(event) => setAvailableTeams(event.target.value)}
                rows={5}
                placeholder="One team per line"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                required
              />
            </>
          ) : null}

          {kind === 'COFFEE_ROULETTE' ? (
            <>
              {mode === 'cycle' ? (
                <input
                  value={weekLabel}
                  onChange={(event) => setWeekLabel(event.target.value)}
                  placeholder="Week label"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
                />
              ) : null}
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder="Meeting prompt"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
              />
              <input
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
                type="datetime-local"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#0033A0] focus:ring-2 focus:ring-[#0033A0]/20"
              />
            </>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Saving...' : mode === 'league' ? 'Create League' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
