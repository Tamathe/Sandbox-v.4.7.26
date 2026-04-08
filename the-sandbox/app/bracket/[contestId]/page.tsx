'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Trophy, Users,
  Settings, AlertCircle, Loader2, ClipboardList, X
} from 'lucide-react'
import { getTeamById } from '../../lib/bracket/bracket-2026'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import BracketBoard from '../../components/bracket/BracketBoard'
import GameChat from '../../components/bracket/GameChat'

interface LeaderboardEntry {
  userId: string
  name: string
  score: number
  maxPossible: number
  isEliminated: boolean
  rank: number
  isYou: boolean
  pickCount: number
}

interface ContestResult {
  gameId: string
  winnerId: string
  round: number
  enteredAt: string
}

interface Contest {
  id: string
  name: string
  status: 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'
  accessCode: string
  commissionerId: string
}

interface BracketEntry {
  picks: Record<string, string>
  userId: string
}

interface ContestData {
  contest: Contest
  leaderboard: LeaderboardEntry[]
  myEntry: BracketEntry | null
  results: ContestResult[]
  isCommissioner: boolean
}

const STATUS_LABELS: Record<Contest['status'], string> = {
  PICKING: 'Open — Pick Now',
  LOCKED: 'Locked',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
}

const STATUS_COLORS: Record<Contest['status'], string> = {
  PICKING: 'bg-green-100 text-green-800',
  LOCKED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-gray-100 text-gray-700',
}

const ROUND_NAMES: Record<number, string> = {
  1: 'Round of 64', 2: 'Round of 32', 3: 'Sweet 16',
  4: 'Elite Eight', 5: 'Final Four', 6: 'Championship',
}

export default function ContestPage() {
  const params = useParams()
  const contestId = params.contestId as string
  const { currentUser } = useAuth()

  const [data, setData] = useState<ContestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'leaderboard' | 'bracket'>('leaderboard')
  const [dismissed, setDismissed] = useState(false)

  const fetchContest = useCallback(async () => {
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) {
        setError('Contest not found')
        return
      }
      const d = await res.json()
      setData(d)
    } catch {
      setError('Failed to load contest')
    } finally {
      setLoading(false)
    }
  }, [contestId, currentUser.email])

  useEffect(() => {
    fetchContest()
  }, [fetchContest])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-gray-700 font-semibold">{error ?? 'Contest not found'}</p>
        <Link href="/bracket" className="text-[#0033A0] underline text-sm">Back to contests</Link>
      </div>
    )
  }

  const { contest, leaderboard, myEntry, results, isCommissioner } = data
  const hasPicks = myEntry && Object.keys(myEntry.picks).length > 0
  const showPicksCTA = contest.status === 'PICKING' && !hasPicks
  const pickCount = myEntry ? Object.keys(myEntry.picks as Record<string, string>).length : 0
  const showIncompleteCTA = contest.status === 'PICKING' && myEntry !== null && pickCount < 63 && !dismissed

  const resultsByRound: Record<number, ContestResult[]> = {}
  for (const r of results) {
    if (!resultsByRound[r.round]) resultsByRound[r.round] = []
    resultsByRound[r.round].push(r)
  }

  const myLeaderboardEntry = leaderboard.find(e => e.isYou) ?? null

  const resultMap = new Map(results.map(r => [r.gameId, r.winnerId]))
  const myPicks = myEntry ? (myEntry.picks as Record<string, string>) : {}
  const picksAlive = Object.entries(myPicks).filter(
    ([gameId, pickedWinnerId]) => resultMap.get(gameId) === pickedWinnerId
  ).length

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={contest.name}
        subtitle={`${leaderboard.length} player${leaderboard.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/bracket"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Contests
            </Link>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[contest.status]}`}>
              {STATUS_LABELS[contest.status]}
            </span>
            {isCommissioner && (
              <Link
                href={`/bracket/${contestId}/manage`}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                <Settings className="size-4" />
                Manage
              </Link>
            )}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* CTA banner */}
        {showPicksCTA && (
          <div className="border-2 border-[#0033A0] bg-blue-50 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-extrabold text-[#0033A0] text-lg">Fill out your bracket!</p>
              <p className="text-sm text-blue-700 mt-0.5">You have not made any picks yet. Do not miss out!</p>
            </div>
            <Link
              href={`/bracket/${contestId}/picks`}
              className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              Pick Now
            </Link>
          </div>
        )}

        {/* Personal stats strip */}
        {myEntry && myLeaderboardEntry && (
          <div className="border-2 border-gray-200 rounded-2xl bg-white px-6 py-4 flex flex-wrap items-center gap-6 mb-6">
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl text-gray-900">#{myLeaderboardEntry.rank}</span>
              <span className="text-xs text-gray-400 mt-0.5">Your Rank</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl text-gray-900">{myLeaderboardEntry.score}</span>
              <span className="text-xs text-gray-400 mt-0.5">Points</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl text-gray-900">{myLeaderboardEntry.maxPossible}</span>
              <span className="text-xs text-gray-400 mt-0.5">Max Possible</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl text-gray-900">{picksAlive}</span>
              <span className="text-xs text-gray-400 mt-0.5">Picks Alive</span>
            </div>
            {myLeaderboardEntry.isEliminated && (
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                Eliminated
              </span>
            )}
          </div>
        )}

        {/* Incomplete picks CTA */}
        {showIncompleteCTA && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 flex items-center gap-3 mb-4">
            <ClipboardList className="size-5 text-amber-600 animate-pulse flex-shrink-0" />
            <p className="font-semibold text-amber-800">
              You have {63 - pickCount} games left to pick before the commissioner locks the bracket.{' '}
              <Link
                href={`/bracket/${contestId}/picks`}
                className="underline text-amber-600 hover:text-amber-800"
              >
                Finish your picks →
              </Link>
            </p>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="ml-auto flex-shrink-0"
            >
              <X className="size-4 text-amber-500 hover:text-amber-700" />
            </button>
          </div>
        )}

        {/* View toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => setView('leaderboard')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === 'leaderboard'
                ? 'bg-[#0033A0] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setView('bracket')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === 'bracket'
                ? 'bg-[#0033A0] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bracket
          </button>
        </div>

        {view === 'bracket' ? (
          <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
            <BracketBoard picks={myEntry?.picks ?? {}} results={results} contestStatus={contest.status} />
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
                  <Trophy className="size-5 text-amber-500" />
                  Leaderboard
                </h2>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Users className="size-3.5" />
                  {leaderboard.length} players · out of 192
                </span>
              </div>
              {leaderboard.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  <p className="text-sm">No entries yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 px-6 py-3.5 ${entry.isYou ? 'bg-blue-50' : ''}`}
                    >
                      <span className="w-7 text-center font-extrabold text-gray-400 text-sm">
                        {entry.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate">{entry.name}</span>
                          {entry.isYou && (
                            <span className="text-xs bg-[#0033A0] text-white px-1.5 py-0.5 rounded font-bold">You</span>
                          )}
                          {entry.isEliminated && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">Eliminated</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Max possible: {entry.maxPossible}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-gray-900 text-lg">{entry.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Results Timeline */}
            {results.length > 0 && (
              <div className="border-2 border-gray-200 rounded-2xl bg-white p-6 mt-4">
                <h2 className="font-extrabold text-lg text-gray-900 mb-4">Results Timeline</h2>
                <div className="space-y-5">
                  {Object.entries(resultsByRound)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([round, roundResults]) => (
                      <div key={round}>
                        <p className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">
                          {ROUND_NAMES[Number(round)] ?? `Round ${round}`}
                        </p>
                        <div className="space-y-1.5">
                          {roundResults.map((r) => {
                            const teamName = getTeamById(r.winnerId)?.name ?? r.winnerId
                            return (
                              <div key={r.gameId} className="flex items-center gap-2 text-sm text-gray-700">
                                <Trophy className="size-3.5 text-amber-500 flex-shrink-0" />
                                <span className="font-semibold">{teamName}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat sidebar */}
          <GameChat
            contestId={contestId}
            userEmail={currentUser.email}
            currentUserId={currentUser.id}
            contestStatus={contest.status}
          />
        </div>
        )}

      </div>
    </div>
  )
}
