'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Plus, KeyRound, ClipboardList, Zap, Calendar } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth-context'
import ContestCard from '../components/bracket/ContestCard'
import { TOURNAMENT_SCHEDULE } from '../lib/bracket/bracket-2026'

interface Contest {
  id: string
  name: string
  accessCode: string
  status: 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'
  _count: { entries: number }
  commissionerId: string
  myPickCount: number
  myScore?: number
  myRank?: number
}

const HOW_IT_WORKS = [
  {
    Icon: Trophy,
    step: '1',
    title: 'Create or Join',
    description:
      "Start your own contest with a custom name, or enter an access code to join a friend's pool.",
  },
  {
    Icon: ClipboardList,
    step: '2',
    title: 'Fill Your Bracket',
    description:
      'Pick winners for all 63 games before the commissioner locks picks.',
  },
  {
    Icon: Zap,
    step: '3',
    title: 'Track & Win',
    description:
      'Watch the leaderboard update live as results come in. Most points wins!',
  },
]

function TournamentScheduleStrip() {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white p-6">
      <h2 className="font-extrabold text-gray-900 flex items-center gap-2 mb-4">
        <Calendar className="size-5 text-[#0033A0]" />
        Tournament Schedule
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TOURNAMENT_SCHEDULE.map((round) => {
          const isPast = today > round.startDate
          const isCurrent = today >= round.startDate && (
            TOURNAMENT_SCHEDULE.find(r => r.round === round.round + 1)
              ? today < TOURNAMENT_SCHEDULE.find(r => r.round === round.round + 1)!.startDate
              : true
          )

          return (
            <div
              key={round.round}
              className={`rounded-xl px-3 py-3 text-center transition-colors ${
                isCurrent
                  ? 'bg-[#0033A0] text-white'
                  : isPast
                    ? 'bg-gray-50 text-gray-400'
                    : 'bg-blue-50 text-gray-700'
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                isCurrent ? 'text-blue-200' : isPast ? 'text-gray-300' : 'text-gray-400'
              }`}>
                {round.label}
              </p>
              <p className={`font-extrabold text-sm ${
                isCurrent ? 'text-white' : ''
              }`}>
                {round.dates}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BracketHubPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bracket/contests', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((r) => r.json())
      .then((data: { contests?: Contest[] }) => setContests(data.contests ?? []))
      .catch(() => setContests([]))
      .finally(() => setLoading(false))
  }, [currentUser.email])

  function handleOpen(contestId: string) {
    router.push(`/bracket/${contestId}`)
  }

  const firstPickingEmpty = contests.find(
    (c) => c.status === 'PICKING' && c.myPickCount === 0
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="March Madness"
        subtitle="The 2026 NCAA Bracket Challenge"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/bracket/join"
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-[#0033A0] text-[#0033A0] rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              <KeyRound className="size-4" />
              Join with Code
            </Link>
            <Link
              href="/bracket/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors"
            >
              <Plus className="size-4" />
              Create Contest
            </Link>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Contest list */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="animate-spin size-6 border-2 border-gray-300 border-t-[#0033A0] rounded-full mr-3" />
            Loading contests…
          </div>
        ) : contests.length === 0 ? (
          <div className="border-2 border-[#0033A0] rounded-2xl bg-white p-10 text-center">
            <div className="size-16 rounded-full bg-[#0033A0] flex items-center justify-center mx-auto">
              <Trophy className="size-8 text-white" />
            </div>
            <h2 className="font-extrabold text-2xl text-gray-900 mt-4 mb-2">
              The Bracket is your March Madness HQ
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Invite friends, fill your picks, and watch the leaderboard update live as games come in.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/bracket/new"
                className="px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
              >
                Create Your Contest
              </Link>
              <Link
                href="/bracket/join"
                className="px-5 py-2.5 border-2 border-[#0033A0] text-[#0033A0] rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Join with Code
              </Link>
            </div>

            {/* How it works — only for first-time users */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200">
              {HOW_IT_WORKS.map(({ Icon, step, title, description }) => (
                <div key={step} className="flex flex-col items-center text-center gap-3">
                  <div className="size-12 rounded-full bg-[#0033A0] flex items-center justify-center flex-shrink-0">
                    <Icon className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                      Step {step}
                    </p>
                    <p className="font-extrabold text-gray-900 mb-1">{title}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {firstPickingEmpty && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 flex items-center gap-3">
                <ClipboardList className="animate-pulse text-amber-600 size-5 flex-shrink-0" />
                <p className="font-semibold text-amber-800">
                  Your bracket is empty — fill it before picks lock!{' '}
                  <Link
                    href={`/bracket/${firstPickingEmpty.id}/picks`}
                    className="underline text-amber-800"
                  >
                    Fill it now →
                  </Link>
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contests.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  isCommissioner={contest.commissionerId === currentUser.id}
                  myScore={contest.myScore}
                  myRank={contest.myRank}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tournament Schedule */}
        <TournamentScheduleStrip />
      </div>
    </div>
  )
}
