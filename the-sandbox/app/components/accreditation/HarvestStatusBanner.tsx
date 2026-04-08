'use client'

import { RefreshCw, Clock, Database } from 'lucide-react'

interface HarvestStatusBannerProps {
  lastHarvestDate: string | null
  evidenceCount: number
  onRunHarvest?: () => void
  harvesting?: boolean
}

export default function HarvestStatusBanner({ lastHarvestDate, evidenceCount, onRunHarvest, harvesting }: HarvestStatusBannerProps) {
  const daysSinceHarvest = lastHarvestDate
    ? Math.floor((Date.now() - new Date(lastHarvestDate).getTime()) / 86400000)
    : null

  const isStale = daysSinceHarvest !== null && daysSinceHarvest > 14

  return (
    <div className={`rounded-2xl border px-5 py-3 flex items-center justify-between ${
      isStale ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Database className="size-4" />
          <span className="font-medium">{evidenceCount}</span>
          <span>evidence items</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="size-4" />
          {lastHarvestDate ? (
            <span>
              Last harvest: {new Date(lastHarvestDate).toLocaleDateString()}
              {isStale && <span className="ml-1 text-amber-600 font-medium">(stale)</span>}
            </span>
          ) : (
            <span>Never harvested</span>
          )}
        </div>
      </div>
      {onRunHarvest && (
        <button
          onClick={onRunHarvest}
          disabled={harvesting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className={`size-3 ${harvesting ? 'animate-spin' : ''}`} />
          {harvesting ? 'Harvesting...' : 'Run Harvest'}
        </button>
      )}
    </div>
  )
}
