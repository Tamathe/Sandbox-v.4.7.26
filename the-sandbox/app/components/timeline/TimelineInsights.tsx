'use client'

import {
  Activity,
  Brain,
  ArrowRightLeft,
  Lightbulb,
  Target,
  Flame,
} from 'lucide-react'

interface TimelineStats {
  totalSessions: number
  conceptsMastered: number
  transferEvents: number
  misconceptionsOvercome: number
  bloomPeak: number
  longestStreak: number
}

const BLOOM_LABELS: Record<number, string> = {
  0: '—',
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

interface TimelineInsightsProps {
  stats: TimelineStats | null
  loading: boolean
}

export default function TimelineInsights({ stats, loading }: TimelineInsightsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Insights</h3>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-50 h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { icon: Activity, label: 'Total Sessions', value: stats.totalSessions, color: 'text-orange-600 bg-orange-50' },
    { icon: Brain, label: 'Concepts Mastered', value: stats.conceptsMastered, color: 'text-purple-600 bg-purple-50' },
    { icon: ArrowRightLeft, label: 'Transfer Events', value: stats.transferEvents, color: 'text-green-600 bg-green-50' },
    { icon: Lightbulb, label: 'Misconceptions Overcome', value: stats.misconceptionsOvercome, color: 'text-yellow-600 bg-yellow-50' },
    { icon: Target, label: 'Bloom Peak', value: BLOOM_LABELS[stats.bloomPeak] ?? `Level ${stats.bloomPeak}`, color: 'text-blue-600 bg-blue-50' },
    { icon: Flame, label: 'Longest Streak', value: `${stats.longestStreak}d`, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Insights</h3>
      <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-100 p-3 flex flex-col items-center text-center"
            >
              <div className={`size-8 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>
                <Icon className="size-4" />
              </div>
              <span className="text-lg font-extrabold text-gray-900">{card.value}</span>
              <span className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">
                {card.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
