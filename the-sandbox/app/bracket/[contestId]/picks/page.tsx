'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle, Save, CheckCircle, ChevronRight } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import { useAuth } from '../../../lib/auth-context'
import {
  BRACKET_TEAMS, BRACKET_2026,
  type BracketTeam, type BracketGame, type BracketRegion,
} from '../../../lib/bracket/bracket-2026'

type TabKey = BracketRegion | 'final_four' | 'championship'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'east', label: 'East' },
  { key: 'west', label: 'West' },
  { key: 'south', label: 'South' },
  { key: 'midwest', label: 'Midwest' },
  { key: 'final_four', label: 'Final Four' },
  { key: 'championship', label: 'Championship' },
]

const TOTAL_GAMES = 63
const REGIONS = ['East', 'West', 'South', 'Midwest'] as const
const REGION_ORDER = ['east', 'west', 'south', 'midwest'] as const
type RegionKey = typeof REGION_ORDER[number]

function regionPickCount(regionKey: string, picks: Record<string, string>): number {
  return BRACKET_2026.games
    .filter((g) => g.round === 1 && g.region === regionKey.toLowerCase())
    .map((g) => g.id)
    .filter((id) => picks[id]).length
}

function teamById(id: string): BracketTeam | undefined {
  return BRACKET_TEAMS.find((t) => t.id === id)
}

function resolveSlot(
  game: BracketGame,
  slot: 'A' | 'B',
  picks: Record<string, string>
): BracketTeam | null {
  const slotId = slot === 'A' ? game.slotA : game.slotB
  const isGame = slot === 'A' ? game.slotAIsGame : game.slotBIsGame

  if (!isGame) {
    return teamById(slotId) ?? null
  }
  const winnerId = picks[slotId]
  if (!winnerId) return null
  return teamById(winnerId) ?? null
}

interface TeamBtnProps {
  team: BracketTeam | null
  winner: string | undefined
  onPick: (teamId: string) => void
}

function TeamBtn({ team, winner, onPick }: TeamBtnProps) {
  if (!team) {
    return (
      <button disabled className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 opacity-40 text-gray-400 text-sm">
        <span className="size-5 rounded bg-gray-100 flex-shrink-0" />
        <span>TBD</span>
      </button>
    )
  }
  const isWinner = winner === team.id
  return (
    <button
      onClick={() => onPick(team.id)}
      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
        isWinner
          ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="w-5 text-center text-xs font-bold text-gray-400 flex-shrink-0">{team.seed}</span>
      <span className="truncate">{team.name}</span>
      {isWinner && <CheckCircle className="size-3.5 ml-auto flex-shrink-0" />}
    </button>
  )
}

interface GameCardProps {
  game: BracketGame
  picks: Record<string, string>
  onPick: (gameId: string, teamId: string) => void
}

function GameCard({ game, picks, onPick }: GameCardProps) {
  const teamA = resolveSlot(game, 'A', picks)
  const teamB = resolveSlot(game, 'B', picks)
  const winner = picks[game.id]

  return (
    <div className="border-2 border-gray-100 rounded-2xl p-3 bg-white space-y-1.5">
      <TeamBtn team={teamA} winner={winner} onPick={(teamId) => onPick(game.id, teamId)} />
      <div className="text-center text-xs text-gray-300 font-bold">vs</div>
      <TeamBtn team={teamB} winner={winner} onPick={(teamId) => onPick(game.id, teamId)} />
    </div>
  )
}

interface PicksLockModalProps {
  picks: Record<string, string>
  totalGames: number
  onConfirm: () => void
  onCancel: () => void
}

function PicksLockModal({ picks, totalGames, onConfirm, onCancel }: PicksLockModalProps) {
  const pickCount = Object.keys(picks).length
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="border-2 border-gray-200 rounded-2xl bg-white p-8 max-w-md w-full">
        <h2 className="font-extrabold text-xl mb-4">Lock In Your Picks?</h2>
        <div className="flex items-center gap-1.5 mb-4">
          <span className="font-bold text-gray-900">{pickCount}</span>
          <span className="text-gray-500">/ {totalGames} picks made</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => {
            const complete = regionPickCount(region, picks) === 8
            return (
              <span
                key={region}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  complete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {region} {complete ? '✓' : '✗'}
              </span>
            )
          })}
        </div>
        {pickCount < totalGames && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mt-4">
            You have {totalGames - pickCount} unpicked game{totalGames - pickCount !== 1 ? 's' : ''}. They&apos;ll count as wrong if picks lock.
          </div>
        )}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-[#0033A0] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            Confirm & Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PicksPage() {
  const params = useParams()
  const router = useRouter()
  const contestId = params.contestId as string
  const { currentUser } = useAuth()

  const [picks, setPicks] = useState<Record<string, string>>({})
  const [contestStatus, setContestStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('east')
  const [showLockModal, setShowLockModal] = useState(false)

  const headers = { 'x-demo-user-email': currentUser.email }

  const loadData = useCallback(async () => {
    try {
      const [contestRes, picksRes] = await Promise.all([
        fetch(`/api/bracket/contests/${contestId}`, { headers }),
        fetch(`/api/bracket/contests/${contestId}/picks`, { headers }),
      ])

      const contestData = await contestRes.json()
      const picksData = await picksRes.json()

      const status = contestData.contest?.status
      setContestStatus(status)

      if (status !== 'PICKING') {
        router.replace(`/bracket/${contestId}`)
        return
      }

      const entryPicks = picksData.picks ?? picksData.entry?.picks ?? {}
      setPicks(entryPicks)
    } catch {
      setError('Failed to load picks')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, currentUser.email])

  useEffect(() => { loadData() }, [loadData])

  function handlePick(gameId: string, teamId: string) {
    setPicks((prev) => ({ ...prev, [gameId]: teamId }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/bracket/contests/${contestId}/picks`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save picks')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  function handleOpenModal() {
    setShowLockModal(true)
  }

  function handleConfirmSave() {
    setShowLockModal(false)
    void handleSave()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (error && !contestStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-red-400" />
        <p className="text-gray-700 font-semibold">{error}</p>
        <Link href={`/bracket/${contestId}`} className="text-[#0033A0] underline text-sm">Back to contest</Link>
      </div>
    )
  }

  const pickCount = Object.keys(picks).length
  const pct = Math.round((pickCount / TOTAL_GAMES) * 100)

  const tabGames = BRACKET_2026.games.filter((g) => g.region === activeTab)

  // Region progress for next-region button
  const currentRegionIdx = REGION_ORDER.indexOf(activeTab as RegionKey)
  const isOnRegionTab = currentRegionIdx >= 0
  const currentR1Count = isOnRegionTab ? regionPickCount(activeTab, picks) : 0
  const nextRegionTab = isOnRegionTab
    ? REGION_ORDER.slice(currentRegionIdx + 1).find((r) => regionPickCount(r, picks) < 8)
    : undefined
  const showNextBtn = isOnRegionTab && currentR1Count === 8 && nextRegionTab !== undefined

  return (
    <div className="min-h-screen bg-gray-50">
      {showLockModal && (
        <PicksLockModal
          picks={picks}
          totalGames={TOTAL_GAMES}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowLockModal(false)}
        />
      )}

      <PageHeader
        title="Your Picks"
        subtitle="Select winners for each matchup"
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/bracket/${contestId}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to contest
            </Link>
          </div>
        }
      />

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-[#0033A0] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
              {pickCount} / {TOTAL_GAMES} picks made
            </span>
            <button
              onClick={handleOpenModal}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-[#0033A0] text-white hover:bg-blue-800 disabled:opacity-50'
              }`}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle className="size-3.5" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Picks'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Region tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
          {TABS.map((tab) => {
            const isRegion = (REGION_ORDER as readonly string[]).includes(tab.key)
            const r1Count = isRegion ? regionPickCount(tab.key, picks) : 0
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#0033A0] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {isRegion && r1Count === 8 && (
                  <span className={isActive ? ' ml-1' : ' ml-1 text-green-500'}>✓</span>
                )}
                {isRegion && r1Count < 8 && (
                  <span className={isActive ? ' ml-1' : ' ml-1 text-gray-400 text-xs'}>{r1Count}/8</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Games grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tabGames.map((game) => (
            <GameCard key={game.id} game={game} picks={picks} onPick={handlePick} />
          ))}
        </div>

        {tabGames.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No games in this section</p>
          </div>
        )}

        {/* Next region auto-advance */}
        <div className={`mt-4 flex justify-end transition-opacity duration-300 ${showNextBtn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={() => nextRegionTab && setActiveTab(nextRegionTab)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors"
          >
            Next region →
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-start">
          <Link
            href={`/bracket/${contestId}`}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            View Standings
          </Link>
        </div>
      </div>
    </div>
  )
}
