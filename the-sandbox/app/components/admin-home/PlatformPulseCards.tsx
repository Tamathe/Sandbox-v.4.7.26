'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, Trophy } from 'lucide-react'
import type { DailyMetric, ToolUsage } from './useAdminHome'

const PlatformPulseChart = dynamic(
  () => import('./PlatformPulseChart').then(m => m.PlatformPulseChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-gray-100" /> }
)

// ─── Types ──────────────────────────────────────────────────

interface PlatformPulseCardsProps {
  usageTrend: DailyMetric[]
  topTools: ToolUsage[]
}

// ─── Component ──────────────────────────────────────────────

const PlatformPulseCards = memo(function PlatformPulseCards({ usageTrend, topTools }: PlatformPulseCardsProps) {
  const maxSessions = Math.max(...topTools.map(t => t.sessions))

  return (
    <>
      {/* 7-Day Usage Trend */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="size-4 text-gray-900" />
          <h2 className="text-base font-extrabold text-gray-900">Usage Trend</h2>
        </div>

        <div className="h-40">
          <PlatformPulseChart usageTrend={usageTrend} />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#0033A0]" />
            <span className="text-xs text-gray-400">Active Users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-400">Sessions</span>
          </div>
        </div>
      </div>

      {/* Top Tools */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-gray-900" />
          <h2 className="text-base font-extrabold text-gray-900">Top Tools</h2>
        </div>

        <div className="space-y-2">
          {topTools.map((tool, i) => (
            <div key={tool.name} className="relative flex items-center gap-3 py-1.5">
              {/* Background bar */}
              <div
                className="absolute inset-0 bg-[#0033A0]/10 rounded-lg"
                style={{ width: `${(tool.sessions / maxSessions) * 100}%` }}
              />

              {/* Content */}
              <span className="relative text-xs font-bold text-gray-400 w-4 text-right">{i + 1}</span>
              <div className="relative flex-1 min-w-0">
                <span className="text-sm font-bold text-gray-900">{tool.name}</span>
                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2">
                  {tool.category}
                </span>
              </div>
              <span className="relative text-xs text-gray-400">{tool.sessions}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})

export default PlatformPulseCards
