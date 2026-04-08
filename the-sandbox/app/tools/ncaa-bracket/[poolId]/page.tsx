'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { useParams, useRouter } from 'next/navigation'
import { Trophy, ClipboardEdit, Lock, Copy, Check, Bell, BellOff } from 'lucide-react'
import { ROUND_NAMES } from '../../../lib/bracket-teams'

interface Game { gameNumber: number; round: number; team1: string; team2: string; winner: string | null; played: boolean }
interface LeaderboardEntry { userId: string; name: string; score: number; rank: number; isYou: boolean }
interface PoolData {
  pool: { id: string; name: string; year: number; locked: boolean; joinCode?: string; scoringType: string; creatorId: string; creatorName: string }
  games: Game[]
  leaderboard: LeaderboardEntry[]
  myEntry: { id: string; score: number; picks: Record<string, string> } | null
  isCreator: boolean
  isMember: boolean
  isSubscribedToEmail: boolean
}

export default function PoolPage() {
  const { currentUser } = useAuth()
  const { poolId } = useParams<{ poolId: string }>()
  const router = useRouter()
  const [data, setData] = useState<PoolData | null>(null)
  const [loading, setLoading] = useState(true)

  // Admin: enter result
  const [resultGame, setResultGame] = useState('')
  const [resultWinner, setResultWinner] = useState('')
  const [submittingResult, setSubmittingResult] = useState(false)

  // Email subscribe
  const [subEmail, setSubEmail] = useState('')
  const [showSubForm, setShowSubForm] = useState(false)

  const [copied, setCopied] = useState(false)

  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email ?? '' }

  useEffect(() => {
    if (!currentUser) return
    fetch(`/api/brackets/${poolId}`, { headers })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [currentUser, poolId])

  async function lockPool() {
    if (!confirm('Lock the bracket? Participants will no longer be able to change their picks.')) return
    await fetch(`/api/brackets/${poolId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action: 'lock' }),
    })
    setData(d => d ? { ...d, pool: { ...d.pool, locked: true } } : d)
  }

  async function submitResult(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingResult(true)
    await fetch(`/api/brackets/${poolId}/results`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gameNumber: parseInt(resultGame), winner: resultWinner }),
    })
    setSubmittingResult(false)
    setResultGame('')
    setResultWinner('')
    // Refresh
    const d = await fetch(`/api/brackets/${poolId}`, { headers }).then(r => r.json())
    setData(d)
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/brackets/${poolId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action: 'subscribe', emailForDigest: subEmail }),
    })
    setData(d => d ? { ...d, isSubscribedToEmail: true } : d)
    setShowSubForm(false)
  }

  async function unsubscribe() {
    await fetch(`/api/brackets/${poolId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action: 'unsubscribe' }),
    })
    setData(d => d ? { ...d, isSubscribedToEmail: false } : d)
  }

  if (loading) return <div className="p-8 text-gray-500 text-center">Loading pool…</div>
  if (!data) return <div className="p-8 text-red-500 text-center">Pool not found.</div>

  const { pool, games, leaderboard, myEntry, isCreator, isSubscribedToEmail } = data

  const unplayedR1 = games.filter(g => g.round === 1 && !g.played)
  const gameOptions = unplayedR1.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-[#0033A0] text-white px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/tools/ncaa-bracket')} className="text-blue-300 text-sm mb-3 hover:text-white">← All Pools</button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-300" /> {pool.name}
              </h1>
              <p className="text-blue-200 text-sm mt-1">{pool.year} Tournament · {pool.scoringType === 'standard' ? 'Standard Scoring' : 'Upset Bonus Scoring'}</p>
            </div>
            <div className="flex items-center gap-2">
              {pool.locked
                ? <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">🔒 Locked</span>
                : <span className="text-xs bg-green-400 text-white px-2 py-1 rounded-full">🟢 Open</span>
              }
            </div>
          </div>

          {/* Join code (creator only) */}
          {isCreator && pool.joinCode && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-blue-200">Join code:</span>
              <span className="font-mono font-bold text-xl tracking-widest bg-white/10 px-3 py-1 rounded">{pool.joinCode}</span>
              <button onClick={() => { navigator.clipboard.writeText(pool.joinCode!); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="text-blue-200 hover:text-white">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Leaderboard</h2>
              <span className="text-sm text-gray-500">{leaderboard.length} participants</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(e => (
                  <tr key={e.userId} className={`border-t border-gray-100 ${e.isYou ? 'bg-blue-50' : ''}`}>
                    <td className="px-5 py-3 font-bold text-gray-500">{e.rank}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{e.name}{e.isYou && <span className="ml-2 text-xs text-blue-600 font-normal">(you)</span>}</td>
                    <td className="px-5 py-3 text-right font-bold text-[#0033A0]">{e.score} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent game results */}
          {games.filter(g => g.played).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Results</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {games.filter(g => g.played).slice(-10).reverse().map(g => (
                  <div key={g.gameNumber} className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{ROUND_NAMES[g.round]} · Game {g.gameNumber}</span>
                    <span className="font-semibold text-gray-900">🏆 {g.winner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* My bracket */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">My Bracket</h3>
            {myEntry ? (
              <>
                <div className="text-3xl font-bold text-[#0033A0]">{myEntry.score} pts</div>
                <div className="text-sm text-gray-500 mb-4">
                  {Object.keys(myEntry.picks).length} picks made
                </div>
                {!pool.locked && (
                  <button
                    onClick={() => router.push(`/tools/ncaa-bracket/${pool.id}/fill`)}
                    className="flex items-center gap-2 w-full justify-center bg-[#0033A0] text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-900 transition"
                  >
                    <ClipboardEdit className="w-4 h-4" /> Edit Picks
                  </button>
                )}
                {pool.locked && (
                  <button
                    onClick={() => router.push(`/tools/ncaa-bracket/${pool.id}/fill`)}
                    className="flex items-center gap-2 w-full justify-center border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    View My Bracket
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => router.push(`/tools/ncaa-bracket/${pool.id}/fill`)}
                className="w-full bg-[#0033A0] text-white py-2 rounded-lg text-sm font-semibold"
              >
                Fill My Bracket
              </button>
            )}
          </div>

          {/* Email digest */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">Weekly Updates</h3>
            <p className="text-xs text-gray-500 mb-3">Get Monday standings emails every week of the tournament.</p>
            {isSubscribedToEmail ? (
              <button onClick={unsubscribe} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600">
                <BellOff className="w-4 h-4" /> Unsubscribe
              </button>
            ) : showSubForm ? (
              <form onSubmit={subscribe} className="space-y-2">
                <input
                  value={subEmail}
                  onChange={e => setSubEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@uky.edu"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button type="submit" className="bg-[#0033A0] text-white px-3 py-1.5 rounded text-sm font-semibold">Subscribe</button>
                  <button type="button" onClick={() => setShowSubForm(false)} className="text-sm text-gray-500">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowSubForm(true)} className="flex items-center gap-2 text-sm text-[#0033A0] font-medium hover:underline">
                <Bell className="w-4 h-4" /> Subscribe to emails
              </button>
            )}
          </div>

          {/* Creator admin panel */}
          {isCreator && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Pool Admin</h3>
              {!pool.locked && (
                <button onClick={lockPool} className="flex items-center gap-2 w-full justify-center border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 mb-4 transition">
                  <Lock className="w-4 h-4" /> Lock Bracket
                </button>
              )}
              <p className="text-xs text-gray-500 mb-2">Enter a game result:</p>
              <form onSubmit={submitResult} className="space-y-2">
                <select
                  value={resultGame}
                  onChange={e => { setResultGame(e.target.value); setResultWinner('') }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Select game…</option>
                  {games.filter(g => !g.played && g.team1 !== 'TBD').map(g => (
                    <option key={g.gameNumber} value={g.gameNumber}>
                      Game {g.gameNumber}: {g.team1} vs {g.team2}
                    </option>
                  ))}
                </select>
                {resultGame && (
                  <select
                    value={resultWinner}
                    onChange={e => setResultWinner(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="">Winner…</option>
                    {(() => {
                      const g = games.find(g => g.gameNumber === parseInt(resultGame))
                      return g ? [g.team1, g.team2].filter(Boolean).map(t => (
                        <option key={t} value={t!}>{t}</option>
                      )) : null
                    })()}
                  </select>
                )}
                <button type="submit" disabled={submittingResult || !resultGame || !resultWinner} className="w-full bg-gray-900 text-white py-2 rounded text-sm font-semibold disabled:opacity-40">
                  {submittingResult ? 'Saving…' : 'Submit Result'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
