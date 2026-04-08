'use client'

import { FileText, BarChart3, Star } from 'lucide-react'
import type { ScoreDimension } from '../../../lib/audio/types'

interface Props {
  summary: string | null
  scores: ScoreDimension[]
  durationSecs: number | null
}

export default function SessionReport({ summary, scores, durationSecs }: Props) {
  const compositeScore = scores.length
    ? scores.reduce((sum, s) => sum + s.score * s.weight, 0) / scores.reduce((sum, s) => sum + s.weight, 0)
    : null

  return (
    <div className="space-y-6">
      {summary && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-4 text-[#0033A0]" />
            <h3 className="font-extrabold text-base text-gray-900">Session Summary</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          {durationSecs && (
            <p className="text-xs text-gray-400 mt-2">{Math.floor(durationSecs / 60)} min {durationSecs % 60}s</p>
          )}
        </div>
      )}

      {scores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-[#0033A0]" />
              <h3 className="font-extrabold text-base text-gray-900">Rubric Scorecard</h3>
            </div>
            {compositeScore !== null && (
              <div className="flex items-center gap-1 text-sm font-semibold text-[#0033A0]">
                <Star className="size-4" />
                {compositeScore.toFixed(1)}/10
              </div>
            )}
          </div>
          <div className="space-y-3">
            {scores.map(s => (
              <div key={s.dimension}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{s.dimension}</span>
                  <span className="text-sm font-semibold text-gray-900">{s.score}/10</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0033A0] rounded-full transition-all"
                    style={{ width: `${(s.score / 10) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{s.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
