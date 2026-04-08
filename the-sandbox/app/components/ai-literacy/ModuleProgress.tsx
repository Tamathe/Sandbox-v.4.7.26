'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trophy, Target, TrendingUp } from 'lucide-react'

interface LevelProgress {
  level?: number
  tier?: number
  attempts: number
  bestScore: number
  avgScore: number
}

interface ProgressData {
  totalAttempts: number
  avgScore: number
  levelProgress?: LevelProgress[]
  tierProgress?: LevelProgress[]
}

interface Level {
  id: number
  name: string
}

interface Props {
  userEmail: string
  apiPath: string
  levels: Level[]
  scoreUnit: string
  masteryThreshold: number
  emptyHeading: string
  emptySubtext: string
  levelPrefix: string
}

export default function ModuleProgress({
  userEmail,
  apiPath,
  levels,
  scoreUnit,
  masteryThreshold,
  emptyHeading,
  emptySubtext,
  levelPrefix,
}: Props) {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(apiPath, {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (res.ok) setData(await res.json())
      setLoading(false)
    }
    void load()
  }, [userEmail, apiPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[#0033A0]" />
      </div>
    )
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <Target className="size-10 text-gray-300 mx-auto mb-3" />
        <h3 className="font-extrabold text-gray-900 mb-1">{emptyHeading}</h3>
        <p className="text-sm text-gray-500">{emptySubtext}</p>
      </div>
    )
  }

  const progressItems = data.levelProgress ?? data.tierProgress ?? []
  const isPercent = scoreUnit === '%'

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center">
          <Target className="size-6 text-[#0033A0] mx-auto mb-2" />
          <div className="text-3xl font-extrabold text-gray-900">{data.totalAttempts}</div>
          <div className="text-xs text-gray-500 mt-1">Total {isPercent ? 'Evaluations' : 'Attempts'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center">
          <TrendingUp className="size-6 text-[#0033A0] mx-auto mb-2" />
          <div className="text-3xl font-extrabold text-gray-900">
            {data.avgScore}<span className="text-lg text-gray-400">{scoreUnit}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Average Score</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center">
          <Trophy className="size-6 text-[#0033A0] mx-auto mb-2" />
          <div className="text-3xl font-extrabold text-gray-900">
            {progressItems.filter(l => l.bestScore >= masteryThreshold).length}
            <span className="text-lg text-gray-400">/{levels.length}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {levels.length <= 3 ? 'Tiers' : 'Levels'} Mastered ({masteryThreshold}{isPercent ? '%' : ''}+)
          </div>
        </div>
      </div>

      {/* Per-level breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h3 className="font-extrabold text-gray-900 mb-4">
          {levels.length <= 3 ? 'Tier' : 'Level'} Breakdown
        </h3>
        <div className="space-y-4">
          {levels.map(level => {
            const progress = progressItems.find(l => (l.level ?? l.tier) === level.id)
            const avg = progress?.avgScore ?? 0
            const barWidth = isPercent ? avg : avg * 10
            const color = isPercent
              ? (avg >= 70 ? 'bg-green-500' : avg >= 40 ? 'bg-yellow-500' : 'bg-gray-200')
              : (avg >= 7 ? 'bg-green-500' : avg >= 4 ? 'bg-yellow-500' : 'bg-gray-200')

            return (
              <div key={level.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">
                    <span className="text-gray-400 mr-1">{levelPrefix}{level.id}</span> {level.name}
                  </span>
                  <span className="text-gray-500">
                    {progress
                      ? `${progress.attempts} attempt${progress.attempts !== 1 ? 's' : ''} · Best ${progress.bestScore}${scoreUnit} · Avg ${progress.avgScore}${scoreUnit}`
                      : 'Not started'}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
