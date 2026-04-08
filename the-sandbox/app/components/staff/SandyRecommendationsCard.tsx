'use client'

import { Bot, ExternalLink } from 'lucide-react'

interface SandyRecommendation {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  actionLabel?: string
  actionType?: string
  relatedItemIds?: string[]
}

interface SandyRecommendationsCardProps {
  recommendations: SandyRecommendation[]
  onAction?: (recommendation: SandyRecommendation) => void
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-400',
}

export default function SandyRecommendationsCard({
  recommendations,
  onAction,
}: SandyRecommendationsCardProps) {
  if (recommendations.length === 0) return null

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5">
      {/* Header with Sandy avatar */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="size-8 rounded-full bg-[#0033A0] flex items-center justify-center flex-shrink-0">
          <Bot className="size-4 text-white" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-900">Sandy&apos;s Recommendations</h2>
      </div>

      <div className="space-y-3">
        {recommendations.map(rec => (
          <div key={rec.id} className="flex items-start gap-3">
            {/* Priority dot */}
            <div className="mt-1.5 flex-shrink-0">
              <div className={`size-2 rounded-full ${PRIORITY_DOT[rec.priority] ?? PRIORITY_DOT.low}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-relaxed">{rec.text}</p>

              {rec.actionLabel && (
                <button
                  onClick={() => onAction?.(rec)}
                  className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-[#0033A0] hover:underline transition-colors"
                >
                  {rec.actionLabel}
                  <ExternalLink className="size-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
