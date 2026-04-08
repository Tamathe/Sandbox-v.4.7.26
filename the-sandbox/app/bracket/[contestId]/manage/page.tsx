'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, KeyRound, Loader2, AlertCircle, Copy, CheckCircle } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import { useAuth } from '../../../lib/auth-context'
import CommissionerPanel, { type CommissionerResult } from '../../../components/bracket/CommissionerPanel'

interface Contest {
  id: string
  name: string
  status: 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'
  accessCode: string
  commissionerId: string
  notifyFrequency: string
  nudgeIntensity: string
  allowAiNudges: boolean
}

interface LeaderboardEntry {
  userId: string
  name: string
  score: number
  maxPossible: number
  isEliminated: boolean
  rank: number
  pickCount: number
}

interface ContestData {
  contest: Contest
  leaderboard: LeaderboardEntry[]
  results: CommissionerResult[]
  isCommissioner: boolean
}

export default function ManagePage() {
  const params = useParams()
  const router = useRouter()
  const contestId = params.contestId as string
  const { currentUser } = useAuth()

  const [data, setData] = useState<ContestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const headers = { 'x-demo-user-email': currentUser.email }

  const loadContest = useCallback(async () => {
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}`, { headers })
      if (!res.ok) {
        setError('Contest not found')
        return
      }
      const d = await res.json()
      if (!d.isCommissioner) {
        router.replace(`/bracket/${contestId}`)
        return
      }
      setData(d)
    } catch {
      setError('Failed to load contest')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, currentUser.email])

  useEffect(() => { loadContest() }, [loadContest])

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

  const { contest, leaderboard, results } = data

  function handleCopyInvite() {
    const link = `${window.location.origin}/bracket/join?code=${contest.accessCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Commissioner Dashboard"
        subtitle={contest.name}
        action={
          <Link
            href={`/bracket/${contestId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to contest
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Contest info */}
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <KeyRound className="size-5 text-[#0033A0]" />
            Contest Settings
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Access Code</p>
              <p className="font-extrabold font-mono text-[#0033A0] text-lg tracking-widest">{contest.accessCode}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Status</p>
              <p className="font-semibold text-gray-900 capitalize">{contest.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Players</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                <Users className="size-3.5" />
                {leaderboard.length}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-0.5">Notify</p>
              <p className="font-semibold text-gray-900 capitalize">{contest.notifyFrequency.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Copy Invite Link */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="size-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy Invite Link
              </>
            )}
          </button>
        </div>

        {/* Incomplete Pickers Panel */}
        {contest.status === 'PICKING' && (() => {
          const incompletePickers = leaderboard.filter(e => e.pickCount < 63)
          if (incompletePickers.length === 0) return null
          return (
            <div className="border-2 border-amber-200 rounded-2xl bg-amber-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="size-5 text-amber-500 flex-shrink-0" />
                <h2 className="font-extrabold text-gray-900">Incomplete Picks</h2>
                <span className="ml-1 bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {incompletePickers.length} of {leaderboard.length} players
                </span>
              </div>
              <div className="divide-y divide-amber-100">
                {incompletePickers.map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 font-semibold text-gray-900 truncate">{entry.name}</span>
                    <span className="text-xs text-amber-700">{entry.pickCount}/63 picks</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-3">
                These players have not finished filling their bracket. Consider sending them a reminder.
              </p>
            </div>
          )
        })()}

        <CommissionerPanel
          contestId={contestId}
          status={contest.status}
          results={results ?? []}
          userEmail={currentUser.email}
          allowAiNudges={contest.allowAiNudges}
          onStatusChange={loadContest}
        />

        {/* Player List */}
        <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
          <h2 className="font-extrabold text-lg text-gray-900 mb-4">Players</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-400">No players yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaderboard.map((entry) => (
                <div key={entry.userId} className="flex items-center gap-3 py-3">
                  <span className="text-gray-400 text-sm w-6">#{entry.rank}</span>
                  <span className="flex-1 font-semibold text-gray-900 truncate">{entry.name}</span>
                  <span className="font-extrabold text-gray-900">{entry.score}</span>
                  <span className="text-gray-400 text-sm">{entry.pickCount} picks</span>
                  <span className="text-gray-400 text-sm">max {entry.maxPossible}</span>
                  {entry.isEliminated && (
                    <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      Eliminated
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
