'use client'

import { Target, Clock } from 'lucide-react'

interface CampaignProgressBarProps {
  title: string
  departmentName: string
  currentCoverage: number // 0-1
  targetCoverage: number // 0-1
  daysRemaining: number
  onTrack: boolean
}

export default function CampaignProgressBar({
  title,
  departmentName,
  currentCoverage,
  targetCoverage,
  daysRemaining,
  onTrack,
}: CampaignProgressBarProps) {
  const currentPct = Math.round(currentCoverage * 100)
  const targetPct = Math.round(targetCoverage * 100)
  const met = currentPct >= targetPct

  return (
    <div className="p-4 bg-white border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-[#0033A0]" />
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="size-3" />
          {met ? 'Target met!' : `${daysRemaining}d remaining`}
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">{departmentName}</p>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            met ? 'bg-green-500' : onTrack ? 'bg-[#0033A0]' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.min(100, currentPct)}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
          style={{ left: `${Math.min(100, targetPct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-xs">
        <span className={met ? 'text-green-600 font-semibold' : 'text-gray-600'}>
          {currentPct}% coverage
        </span>
        <span className="text-gray-400">Target: {targetPct}%</span>
      </div>
    </div>
  )
}
