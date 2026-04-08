'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../../lib/auth-context'
import { useParams, useRouter } from 'next/navigation'
import { Save, ChevronRight } from 'lucide-react'
import { ROUND_NAMES, ROUND_POINTS, REGIONS_ORDER, BRACKET_TEAMS } from '../../../../lib/bracket-teams'

interface Game {
  gameNumber: number
  round: number
  team1: string
  team2: string
  winner: string | null
  played: boolean
}

const REGION_GAME_MAP: Record<string, { r1: number[]; r2: number[]; s16: number[]; e8: number }> = {
  East:    { r1: [1,2,3,4,5,6,7,8],    r2: [33,34,35,36], s16: [49,50], e8: 57 },
  West:    { r1: [9,10,11,12,13,14,15,16], r2: [37,38,39,40], s16: [51,52], e8: 58 },
  South:   { r1: [17,18,19,20,21,22,23,24], r2: [41,42,43,44], s16: [53,54], e8: 59 },
  Midwest: { r1: [25,26,27,28,29,30,31,32], r2: [45,46,47,48], s16: [55,56], e8: 60 },
}

function getSeed(name: string) {
  const t = BRACKET_TEAMS.find(t => t.name === name)
  return t ? `(${t.seed})` : ''
}

export default function FillBracketPage() {
  const { currentUser } = useAuth()
  const { poolId } = useParams<{ poolId: string }>()
  const router = useRouter()

  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeRegion, setActiveRegion] = useState<string>('East')

  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email ?? '' }

  useEffect(() => {
    if (!currentUser) return
    Promise.all([
      fetch(`/api/brackets/${poolId}/entry`, { headers }).then(r => r.json()),
      fetch(`/api/brackets/${poolId}`, { headers }).then(r => r.json()),
    ]).then(([entry, poolData]) => {
      setGames(entry.games ?? [])
      setPicks((entry.picks as Record<string, string>) ?? {})
      setLocked(poolData.pool?.locked ?? false)
    }).finally(() => setLoading(false))
  }, [currentUser, poolId])

  // When a pick is made, advance the winner to next-round game slot
  function makePick(gameNumber: number, team: string) {
    if (locked) return
    setPicks(prev => {
      const updated = { ...prev, [String(gameNumber)]: team }
      return updated
    })
  }

  function getPickedTeam(gameNumber: number): string {
    return picks[String(gameNumber)] ?? ''
  }

  async function savePicks() {
    setSaving(true)
    await fetch(`/api/brackets/${poolId}/entry`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ picks }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function renderGame(gameNumber: number) {
    const game = games.find(g => g.gameNumber === gameNumber)
    if (!game) return null

    const team1 = game.team1 !== 'TBD' ? game.team1 : getPickedTeam(gameNumber)
    const team2 = game.team2 !== 'TBD' ? game.team2 : ''
    const picked = getPickedTeam(gameNumber)
    const isPlayed = game.played

    const teams = [game.team1, game.team2].filter(t => t && t !== 'TBD')

    return (
      <div key={gameNumber} className="bg-white rounded-lg border border-gray-200 text-xs overflow-hidden">
        <div className="px-2 py-1 bg-gray-50 text-gray-400 border-b border-gray-100 flex items-center justify-between">
          <span>Game {gameNumber}</span>
          <span className="text-gray-300">{ROUND_POINTS[game.round]}pt</span>
        </div>
        {teams.length === 0 ? (
          <div className="px-3 py-4 text-gray-300 text-center text-xs">TBD</div>
        ) : teams.map(team => {
          const isPicked = picked === team
          const isWinner = isPlayed && game.winner === team
          const isEliminated = isPlayed && game.winner !== team

          return (
            <button
              key={team}
              onClick={() => !locked && makePick(gameNumber, team)}
              disabled={locked || teams.length < 2}
              className={`w-full text-left px-2 py-2 flex items-center gap-1.5 border-b border-gray-100 last:border-0 transition
                ${isPicked && !isPlayed ? 'bg-blue-50 text-blue-800 font-semibold' : ''}
                ${isWinner ? 'bg-green-50 text-green-800 font-semibold' : ''}
                ${isEliminated ? 'opacity-40 line-through' : ''}
                ${!locked && !isPlayed && teams.length === 2 ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className="text-gray-400 w-5 shrink-0">{getSeed(team)}</span>
              <span className="truncate">{team}</span>
              {isWinner && <span className="ml-auto">✓</span>}
            </button>
          )
        })}
      </div>
    )
  }

  function renderRegion(region: string) {
    const map = REGION_GAME_MAP[region]
    if (!map) return null

    return (
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">{region} Region</h3>
        <div className="grid grid-cols-4 gap-2">
          {/* Round 1 — 8 games */}
          <div>
            <p className="text-xs text-gray-400 mb-2">R64</p>
            <div className="space-y-2">{map.r1.map(n => renderGame(n))}</div>
          </div>
          {/* Round 2 — 4 games */}
          <div>
            <p className="text-xs text-gray-400 mb-2">R32</p>
            <div className="space-y-2 mt-4">{map.r2.map(n => renderGame(n))}</div>
          </div>
          {/* Sweet 16 — 2 games */}
          <div>
            <p className="text-xs text-gray-400 mb-2">S16</p>
            <div className="space-y-2 mt-8">{map.s16.map(n => renderGame(n))}</div>
          </div>
          {/* Elite Eight — 1 game */}
          <div>
            <p className="text-xs text-gray-400 mb-2">E8</p>
            <div className="mt-16">{renderGame(map.e8)}</div>
          </div>
        </div>
      </div>
    )
  }

  const pickCount = Object.keys(picks).length

  if (loading) return <div className="p-8 text-gray-500 text-center">Loading bracket…</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-[#0033A0] text-white px-6 py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => router.push(`/tools/ncaa-bracket/${poolId}`)} className="text-blue-300 text-sm hover:text-white">← Pool</button>
            <h1 className="text-xl font-bold mt-0.5">
              {locked ? 'View Bracket' : 'Fill Your Bracket'}
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">{pickCount} picks made · 63 total</p>
          </div>
          {!locked && (
            <button
              onClick={savePicks}
              disabled={saving}
              className="flex items-center gap-2 bg-white text-[#0033A0] font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Picks'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {/* Region tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[...REGIONS_ORDER, 'Final Four'].map(r => (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeRegion === r ? 'bg-[#0033A0] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Region bracket */}
        {REGIONS_ORDER.includes(activeRegion as typeof REGIONS_ORDER[0]) && (
          <div className="overflow-x-auto">
            {renderRegion(activeRegion)}
          </div>
        )}

        {/* Final Four + Championship */}
        {activeRegion === 'Final Four' && (
          <div className="max-w-lg mx-auto space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Final Four</h3>
            <div className="grid grid-cols-2 gap-4">
              {renderGame(61)}
              {renderGame(62)}
            </div>
            <h3 className="text-sm font-bold text-gray-700 mt-6">Championship</h3>
            {renderGame(63)}
          </div>
        )}

        {!locked && (
          <div className="mt-8 flex justify-center">
            <button onClick={savePicks} disabled={saving} className="flex items-center gap-2 bg-[#0033A0] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-900 transition disabled:opacity-60">
              <Save className="w-5 h-5" />
              {saved ? '✓ Picks Saved!' : saving ? 'Saving…' : 'Save My Picks'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
