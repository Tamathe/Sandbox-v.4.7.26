'use client'

import { CheckCircle, AlertTriangle, XCircle, FileText, BarChart3 } from 'lucide-react'

interface StandardCardProps {
  standardNumber: string
  standardTitle: string
  evidenceCount: number
  quality: string
  gapCount: number
  narrativeStatus: string
  isAutoHarvestable: boolean
  onClick: () => void
}

const qualityColors: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  WEAK: 'bg-orange-100 text-orange-800',
  MISSING: 'bg-red-100 text-red-800',
}

export default function StandardCard({
  standardNumber,
  standardTitle,
  evidenceCount,
  quality,
  gapCount,
  narrativeStatus,
  isAutoHarvestable,
  onClick,
}: StandardCardProps) {
  const StatusIcon = gapCount === 0 && evidenceCount > 0 ? CheckCircle :
    gapCount > 0 ? AlertTriangle : XCircle
  const statusColor = gapCount === 0 && evidenceCount > 0 ? 'text-green-600' :
    gapCount > 0 ? 'text-amber-500' : 'text-red-500'

  return (
    <button
      onClick={onClick}
      className="w-full text-left border-2 border-gray-200 rounded-2xl p-4 bg-white hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`size-5 ${statusColor}`} />
          <span className="text-sm font-extrabold text-gray-900">{standardNumber}</span>
        </div>
        {isAutoHarvestable && (
          <BarChart3 className="size-4 text-blue-400" />
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{standardTitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${qualityColors[quality] ?? 'bg-gray-100 text-gray-600'}`}>
          {quality}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <FileText className="size-3" /> {evidenceCount} evidence
        </span>
        {gapCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="size-3" /> {gapCount} gap{gapCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {narrativeStatus !== 'NOT_STARTED' && (
        <div className="mt-2">
          <span className="text-xs text-gray-400">
            Narrative: {narrativeStatus.replace('_', ' ').toLowerCase()}
          </span>
        </div>
      )}
    </button>
  )
}
