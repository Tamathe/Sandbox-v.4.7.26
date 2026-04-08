'use client'

import { useState } from 'react'
import {
  BRACKET_2026,
  ROUND_NAMES,
  getTeamById,
  type BracketGame,
  type BracketTeam,
  type BracketRegion,
} from '../../lib/bracket/bracket-2026'

const ROUND_ABBR: Record<number, string> = {
  1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'FF', 6: 'Champ',
}

type BoardTab = BracketRegion | 'final_four'

const BOARD_TABS: { key: BoardTab; label: string }[] = [
  { key: 'east', label: 'East' },
  { key: 'west', label: 'West' },
  { key: 'south', label: 'South' },
  { key: 'midwest', label: 'Midwest' },
  { key: 'final_four', label: 'Final Four' },
]

interface ResultItem {
  gameId: string
  winnerId: string
  round: number
  enteredAt: string | Date
}

export interface BracketBoardProps {
  picks: Record<string, string>
  results: ResultItem[]
  contestStatus?: 'PICKING' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETE'
}

function resolveTeam(
  slotId: string | null,
  isGame: boolean,
  picks: Record<string, string>
): BracketTeam | null {
  if (!slotId) return null
  if (!isGame) return getTeamById(slotId) ?? null
  const winnerId = picks[slotId]
  if (!winnerId) return null
  return getTeamById(winnerId) ?? null
}

interface TeamSlotProps {
  team: BracketTeam | null
  isPick: boolean
  isResult: boolean
}

function TeamSlot({ team, isPick, isResult }: TeamSlotProps) {
  if (!team) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-dashed border-gray-200 text-gray-300 italic text-xs">
        <span className="w-4 flex-shrink-0" />
        <span>TBD</span>
      </div>
    )
  }

  const cls = isResult
    ? 'border-green-400 bg-green-50 text-green-800 font-semibold'
    : isPick
      ? 'border-[#0033A0] bg-blue-50 text-[#0033A0] font-semibold'
      : 'border-gray-200 bg-white text-gray-700'

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs ${cls}`}>
      <span className="w-4 text-center flex-shrink-0 font-bold text-gray-400">{team.seed}</span>
      <span className="truncate">{team.name}</span>
    </div>
  )
}

interface GameSlotProps {
  game: BracketGame
  picks: Record<string, string>
  resultMap: Record<string, string>
}

function GameSlot({ game, picks, resultMap }: GameSlotProps) {
  const teamA = resolveTeam(game.slotA, game.slotAIsGame, picks)
  const teamB = resolveTeam(game.slotB, game.slotBIsGame, picks)
  const pickedWinner = picks[game.id]
  const resultWinner = resultMap[game.id]

  const outcomeLabel = resultWinner
    ? pickedWinner === resultWinner
      ? <p className="text-xs text-green-600 font-semibold text-center mt-0.5">✓ Correct!</p>
      : <p className="text-xs text-red-500 font-semibold text-center mt-0.5">✗ Busted</p>
    : null

  return (
    <div>
      <div className="border-2 border-gray-100 rounded-2xl p-2 bg-white space-y-1 w-44">
        <TeamSlot
          team={teamA}
          isPick={!resultWinner && pickedWinner === teamA?.id}
          isResult={!!resultWinner && resultWinner === teamA?.id}
        />
        <div className="text-center text-xs text-gray-300 font-bold">vs</div>
        <TeamSlot
          team={teamB}
          isPick={!resultWinner && pickedWinner === teamB?.id}
          isResult={!!resultWinner && resultWinner === teamB?.id}
        />
      </div>
      {outcomeLabel}
    </div>
  )
}

interface RoundColumnProps {
  roundLabel: string
  games: BracketGame[]
  picks: Record<string, string>
  resultMap: Record<string, string>
}

function RoundColumn({ roundLabel, games, picks, resultMap }: RoundColumnProps) {
  return (
    <div className="flex-shrink-0 w-48">
      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-2 text-center">
        {roundLabel}
      </p>
      <div className="space-y-2">
        {games.map((game) => (
          <GameSlot key={game.id} game={game} picks={picks} resultMap={resultMap} />
        ))}
      </div>
    </div>
  )
}

export default function BracketBoard({ picks, results, contestStatus }: BracketBoardProps) {
  const [activeTab, setActiveTab] = useState<BoardTab>('east')

  const resultMap: Record<string, string> = {}
  for (const r of results) {
    resultMap[r.gameId] = r.winnerId
  }

  const rounds =
    activeTab === 'final_four'
      ? [
          {
            round: 5,
            label: ROUND_NAMES[5],
            games: BRACKET_2026.games.filter((g) => g.region === 'final_four'),
          },
          {
            round: 6,
            label: ROUND_NAMES[6],
            games: BRACKET_2026.games.filter((g) => g.region === 'championship'),
          },
        ]
      : [1, 2, 3, 4].map((r) => ({
          round: r,
          label: ROUND_NAMES[r],
          games: BRACKET_2026.games.filter((g) => g.region === activeTab && g.round === r),
        }))

  const completenessStrip = [1, 2, 3, 4, 5, 6].map((r) => {
    const total = BRACKET_2026.games.filter((g) => g.round === r).length
    const picked = BRACKET_2026.games.filter((g) => g.round === r && !!picks[g.id]).length
    const cls =
      picked === total
        ? 'bg-green-100 text-green-800'
        : picked > 0
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-500'
    return { round: r, label: ROUND_ABBR[r], total, picked, cls }
  })

  return (
    <div>
      {/* Pick completeness legend — only during picking phase */}
      {contestStatus === 'PICKING' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {completenessStrip.map(({ round, label, total, picked, cls }) => (
            <span key={round} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
              {label} {picked}/{total}
            </span>
          ))}
        </div>
      )}

      {/* Tab strip */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
        {BOARD_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#0033A0] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Round columns */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {rounds.map(({ round, label, games }) => (
            <RoundColumn
              key={round}
              roundLabel={label}
              games={games}
              picks={picks}
              resultMap={resultMap}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
