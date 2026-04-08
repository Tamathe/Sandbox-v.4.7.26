'use client'

import { useState } from 'react'
import { Lock, CheckCircle, Trophy, Loader2, AlertCircle, Clock, Mail, Zap } from 'lucide-react'
import { BRACKET_2026, ROUND_NAMES, getTeamById, type BracketGame } from '../../lib/bracket/bracket-2026'
import { formatDistanceToNow } from 'date-fns'

type ContestStatus = 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'

export interface CommissionerResult {
  gameId: string
  winnerId: string
  round: number
  enteredAt: string
}

interface CommissionerPanelProps {
  contestId: string
  status: ContestStatus
  results: CommissionerResult[]
  userEmail: string
  allowAiNudges: boolean
  onStatusChange: () => void
}

const STATUS_COLORS: Record<ContestStatus, string> = {
  PICKING: 'bg-green-100 text-green-800',
  LOCKED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-gray-100 text-gray-700',
}

const STATUS_LABELS: Record<ContestStatus, string> = {
  PICKING: 'Picking Open',
  LOCKED: 'Picks Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
}

const ROUND_ORDER = [1, 2, 3, 4, 5, 6]

function gameLabel(game: BracketGame): string {
  function slotName(slotId: string, isGame: boolean): string {
    if (!isGame) {
      const team = getTeamById(slotId)
      return team ? `${team.seed} ${team.name}` : slotId
    }
    return `Winner of ${slotId}`
  }
  const a = slotName(game.slotA, game.slotAIsGame)
  const b = slotName(game.slotB, game.slotBIsGame)
  return `${a} vs ${b}`
}

export default function CommissionerPanel({
  contestId,
  status,
  results,
  userEmail,
  allowAiNudges,
  onStatusChange,
}: CommissionerPanelProps) {
  const headers = { 'x-demo-user-email': userEmail }

  // Nudge state
  const [nudging, setNudging] = useState(false)
  const [nudgeResult, setNudgeResult] = useState<string | null>(null)
  const [nudgeError, setNudgeError] = useState<string | null>(null)

  // Lock picks state
  const [lockConfirming, setLockConfirming] = useState(false)
  const [locking, setLocking] = useState(false)
  const [lockSuccess, setLockSuccess] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)

  // Enter results state
  const [selectedGameId, setSelectedGameId] = useState('')
  const [selectedWinnerId, setSelectedWinnerId] = useState('')
  const [submittingResult, setSubmittingResult] = useState(false)
  const [resultSuccess, setResultSuccess] = useState(false)
  const [resultError, setResultError] = useState<string | null>(null)

  // Send email state
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleSendNudges() {
    setNudging(true)
    setNudgeResult(null)
    setNudgeError(null)
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/nudge`, {
        method: 'POST',
        headers,
      })
      const d = await res.json()
      if (!res.ok) {
        setNudgeError(d.error ?? 'Failed to send nudges')
        return
      }
      setNudgeResult(`Nudged ${d.sent} player${d.sent === 1 ? '' : 's'}`)
      setTimeout(() => setNudgeResult(null), 3000)
    } catch {
      setNudgeError('Network error — please try again')
    } finally {
      setNudging(false)
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true)
    setEmailSuccess(null)
    setEmailError(null)
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/email`, {
        method: 'POST',
        headers,
      })
      const d = await res.json()
      if (!res.ok) {
        setEmailError(d.error ?? 'Failed to send email')
        return
      }
      setEmailSuccess(`Email sent to ${d.recipientCount} player${d.recipientCount === 1 ? '' : 's'}!`)
      setTimeout(() => setEmailSuccess(null), 5000)
    } catch {
      setEmailError('Network error — please try again')
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleLock() {
    setLocking(true)
    setLockError(null)
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/lock`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) {
        const d = await res.json()
        setLockError(d.error ?? 'Failed to lock picks')
        return
      }
      setLockSuccess(true)
      setLockConfirming(false)
      onStatusChange()
    } catch {
      setLockError('Network error — please try again')
    } finally {
      setLocking(false)
    }
  }

  async function handleEnterResult(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGameId || !selectedWinnerId) return

    const game = BRACKET_2026.games.find((g) => g.id === selectedGameId)
    if (!game) return

    setSubmittingResult(true)
    setResultError(null)
    setResultSuccess(false)

    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/results`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: selectedGameId, winnerId: selectedWinnerId, round: game.round }),
      })
      if (!res.ok) {
        const d = await res.json()
        setResultError(d.error ?? 'Failed to enter result')
        return
      }
      setResultSuccess(true)
      setSelectedGameId('')
      setSelectedWinnerId('')
      setTimeout(() => setResultSuccess(false), 3000)
      onStatusChange()
    } catch {
      setResultError('Network error — please try again')
    } finally {
      setSubmittingResult(false)
    }
  }

  const selectedGame = BRACKET_2026.games.find((g) => g.id === selectedGameId)
  const gamesByRound: Record<number, BracketGame[]> = {}
  for (const game of BRACKET_2026.games) {
    if (!gamesByRound[game.round]) gamesByRound[game.round] = []
    gamesByRound[game.round].push(game)
  }

  // Build winner options for selected game
  function winnerOptions(game: BracketGame) {
    if (!game.slotAIsGame && !game.slotBIsGame) {
      const teamA = getTeamById(game.slotA)
      const teamB = getTeamById(game.slotB)
      return (
        <>
          {teamA && <option value={game.slotA}>{teamA.seed} {teamA.name}</option>}
          {teamB && <option value={game.slotB}>{teamB.seed} {teamB.name}</option>}
        </>
      )
    }
    // Mixed or both are upstream game refs — show placeholder labels
    return (
      <>
        <option value={game.slotA}>
          {game.slotAIsGame ? `Team from game ${game.slotA}` : (() => { const t = getTeamById(game.slotA); return t ? `${t.seed} ${t.name}` : game.slotA })()}
        </option>
        <option value={game.slotB}>
          {game.slotBIsGame ? `Team from game ${game.slotB}` : (() => { const t = getTeamById(game.slotB); return t ? `${t.seed} ${t.name}` : game.slotB })()}
        </option>
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Contest Status */}
      <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
        <h2 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy className="size-5 text-[#0033A0]" />
          Contest Status
        </h2>
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Lock Picks */}
      {status === 'PICKING' && (
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <Lock className="size-5 text-amber-500" />
            Lock Picks
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This prevents any further pick changes. Do this before tournament tip-off.
          </p>

          {lockSuccess ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle className="size-4" />
              Picks locked successfully!
            </div>
          ) : lockConfirming ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-3">
                Are you sure? This cannot be undone. All players will be unable to change their picks.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLock}
                  disabled={locking}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {locking ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                  Yes, Lock Picks
                </button>
                <button
                  onClick={() => setLockConfirming(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setLockConfirming(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              <Lock className="size-4" />
              Lock All Picks
            </button>
          )}
          {lockError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
              <AlertCircle className="size-3.5" />
              {lockError}
            </p>
          )}
        </div>
      )}

      {/* Enter Result */}
      {(status === 'LOCKED' || status === 'IN_PROGRESS') && (
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircle className="size-5 text-[#0033A0]" />
            Enter Result
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Record game results to automatically update scores.
          </p>
          <form onSubmit={handleEnterResult} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Game</label>
              <select
                value={selectedGameId}
                onChange={(e) => { setSelectedGameId(e.target.value); setSelectedWinnerId('') }}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#0033A0] transition-colors"
              >
                <option value="">Select a game...</option>
                {ROUND_ORDER.map((round) =>
                  gamesByRound[round] ? (
                    <optgroup key={round} label={ROUND_NAMES[round] ?? `Round ${round}`}>
                      {gamesByRound[round].map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.id} — {gameLabel(game)}
                        </option>
                      ))}
                    </optgroup>
                  ) : null
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Winner</label>
              <select
                value={selectedWinnerId}
                onChange={(e) => setSelectedWinnerId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#0033A0] transition-colors"
                disabled={!selectedGameId}
              >
                <option value="">Select winner...</option>
                {selectedGame && winnerOptions(selectedGame)}
              </select>
            </div>

            {resultError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="size-3.5" />
                {resultError}
              </p>
            )}
            {resultSuccess && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle className="size-3.5" />
                Result recorded!
              </div>
            )}

            <button
              type="submit"
              disabled={submittingResult || !selectedGameId || !selectedWinnerId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0033A0] text-white rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {submittingResult ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              {submittingResult ? 'Submitting...' : 'Record Result'}
            </button>
          </form>
        </div>
      )}

      {/* Send Round Update Email */}
      {(status === 'IN_PROGRESS' || status === 'COMPLETE') && (
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <Mail className="size-5 text-[#0033A0]" />
            Round Update Email
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Send all players an AI-written standings update with Bracket Buddy commentary.
          </p>

          {emailSuccess ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle className="size-4" />
              {emailSuccess}
            </div>
          ) : (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm"
            >
              {sendingEmail ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {sendingEmail ? 'Sending...' : 'Send Round Update Email'}
            </button>
          )}
          {emailError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
              <AlertCircle className="size-3.5" />
              {emailError}
            </p>
          )}
        </div>
      )}

      {/* AI Nudges */}
      {status === 'IN_PROGRESS' && allowAiNudges && (
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            AI Nudges
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Send personalized AI-written trash talk or encouragement to players in the bottom half.
          </p>

          {nudgeResult ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
              <CheckCircle className="size-4" />
              {nudgeResult}
            </div>
          ) : (
            <button
              onClick={handleSendNudges}
              disabled={nudging}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors text-sm"
            >
              {nudging ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {nudging ? 'Sending…' : 'Send AI Nudges'}
            </button>
          )}
          {nudgeError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
              <AlertCircle className="size-3.5" />
              {nudgeError}
            </p>
          )}
        </div>
      )}

      {/* Recent Results */}
      {status !== 'PICKING' && (
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="size-5 text-gray-500" />
            Recent Results
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No results entered yet.</p>
          ) : (
            <div className="space-y-2">
              {[...results].sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime()).slice(0, 10).map((r) => {
                const team = getTeamById(r.winnerId)
                const game = BRACKET_2026.games.find((g) => g.id === r.gameId)
                return (
                  <div key={r.gameId} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {team ? `${team.seed} ${team.name}` : r.winnerId}
                      </span>
                      <span className="text-gray-400 ml-2 text-xs">
                        {ROUND_NAMES[r.round] ?? `Round ${r.round}`}
                        {game ? ` — ${game.id}` : ''}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(r.enteredAt), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
