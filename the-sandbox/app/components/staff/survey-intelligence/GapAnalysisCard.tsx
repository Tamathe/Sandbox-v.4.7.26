'use client'

import { AlertTriangle } from 'lucide-react'

interface GapAnalysisCardProps {
  gaps: Array<{
    gap: string
    suggestion: string
  }>
}

export default function GapAnalysisCard({ gaps }: GapAnalysisCardProps) {
  if (gaps.length === 0) {
    return (
      <div className="border-2 border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="size-5 text-amber-500" />
          <h3 className="text-base font-extrabold text-gray-900">Gap Analysis</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">
          No evidence gaps identified.
        </p>
      </div>
    )
  }

  return (
    <div className="border-2 border-amber-200 rounded-2xl bg-amber-50/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          <h3 className="text-base font-extrabold text-gray-900">Gap Analysis</h3>
          <span className="text-xs text-amber-600 ml-auto">
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {gaps.map((item, i) => (
          <div key={i} className="bg-white border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1.5">
              {item.gap}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold text-amber-700">Suggestion: </span>
              {item.suggestion}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
