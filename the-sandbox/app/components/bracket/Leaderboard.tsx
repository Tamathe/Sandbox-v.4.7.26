'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import type { LeaderboardEntry } from '../../lib/bracket/bracket-service'
import type { BracketEntry } from '../../generated/prisma'

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[]
  myEntry: BracketEntry | null
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  const [showAllEntries, setShowAllEntries] = useState(false)

  if (leaderboard.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-gray-400">
        <Trophy className="size-10 mx-auto mb-3 text-gray-200" />
        <p className="text-sm font-semibold">No entries yet — be the first to join!</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {(showAllEntries ? leaderboard : leaderboard.slice(0, 4)).map((entry) => (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 px-6 py-3.5 ${entry.isYou ? 'bg-blue-50 font-semibold' : ''}`}
        >
          {/* Rank */}
          <span className="w-7 text-center text-sm flex-shrink-0">
            {entry.rank === 1 ? (
              <Trophy className="size-4 text-yellow-500 mx-auto" />
            ) : (
              <span className="font-extrabold text-gray-400">{entry.rank}</span>
            )}
          </span>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`truncate ${entry.isEliminated ? 'text-gray-400' : 'text-gray-900'}`}>
                {entry.name}
              </span>
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

          {/* Score */}
          <div className="text-right flex-shrink-0">
            <span className={`font-extrabold text-lg ${entry.isEliminated ? 'text-gray-400' : 'text-gray-900'}`}>
              {entry.score}
            </span>
            <span className="text-gray-400 text-sm"> / 192</span>
          </div>
        </div>
      ))}
      {leaderboard.length > 4 && (
        <button
          type="button"
          onClick={() => setShowAllEntries(!showAllEntries)}
          className="w-full py-2 text-sm font-medium text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showAllEntries ? 'Show fewer' : `Show all ${leaderboard.length} entries`}
        </button>
      )}
    </div>
  )
}
