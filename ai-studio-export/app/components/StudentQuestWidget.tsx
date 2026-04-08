'use client'

import Link from 'next/link'
import { Trophy, Coins, Flame, CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { getLevelInfo } from '../lib/xp'

interface StudentQuestWidgetProps {
  sandBalance: number
  xp: number
  level: number
  streak: number
}

const QUESTS = [
  { id: 1, title: 'Use a tool today', reward: 25, completed: false, progress: 0, total: 1 },
  { id: 2, title: 'Study Streak (3 days)', reward: 100, completed: true, progress: 3, total: 3 },
  { id: 3, title: 'Score 90%+ on a Quiz', reward: 75, completed: false, progress: 0, total: 1 },
]

export default function StudentQuestWidget({
  sandBalance,
  xp,
  level,
  streak,
}: StudentQuestWidgetProps) {
  const levelInfo = getLevelInfo(xp)
  const nextLevelXP = levelInfo.nextLevelXP ?? xp
  const progressWidth = nextLevelXP > 0 ? Math.min((xp / nextLevelXP) * 100, 100) : 100

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-[#0033A0] to-blue-600 px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Trophy className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Progress</p>
              <p className="text-lg font-bold">Level {level} Scholar</p>
            </div>
          </div>
          <div className="rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Coins className="w-4 h-4 text-amber-300" />
              {sandBalance} Sand
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-blue-100">
            <span>{xp} XP</span>
            {levelInfo.nextLevelXP !== null ? (
              <span>Next Level: {nextLevelXP} XP</span>
            ) : (
              <span className="font-semibold text-yellow-300">Max Level</span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-blue-950/35">
            <div
              className="h-2.5 rounded-full bg-yellow-400 transition-all duration-500"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Daily Quests</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
            <Flame className="w-3 h-3" />
            {streak} Day Streak
          </span>
          <span className="ml-auto text-[11px] text-gray-400">Resets in 4h</span>
        </div>

        <div className="space-y-3">
          {QUESTS.map((quest) => {
            const progress = quest.total > 0 ? Math.min((quest.progress / quest.total) * 100, 100) : 0

            return (
              <div key={quest.id} className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3">
                <div className="flex items-center gap-2">
                  {quest.completed ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                  ) : (
                    <Circle className="w-4 h-4 flex-shrink-0 text-gray-300" />
                  )}
                  <span
                    className={`flex-1 text-sm font-medium ${
                      quest.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}
                  >
                    {quest.title}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {quest.reward}
                  </span>
                </div>
                {!quest.completed && (
                  <div className="mt-2 ml-6">
                    <div className="h-1.5 w-24 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <Link
          href="/tools"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-3 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
        >
          Visit Sand Store
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
