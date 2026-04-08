'use client'

import { useState } from 'react'
import { MessageCircleQuestion, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import type { QuestionStrategyAnalysis } from '../../lib/virtual-clinic/types'

const TYPE_COLORS: Record<string, string> = {
  'open-ended': 'bg-emerald-100 text-emerald-700',
  'follow-up': 'bg-blue-100 text-blue-700',
  closed: 'bg-amber-100 text-amber-700',
  leading: 'bg-red-100 text-red-700',
}

const BAR_COLORS: Record<string, string> = {
  'open-ended': 'bg-emerald-500',
  'follow-up': 'bg-blue-500',
  closed: 'bg-amber-400',
  leading: 'bg-red-400',
}

export default function QuestionStrategyCard({ data }: { data: QuestionStrategyAnalysis }) {
  const [showExamples, setShowExamples] = useState(false)

  if (data.totalQuestions === 0) return null

  const ratioPercent = Math.round(data.openEndedRatio * 100)
  const ratioLabel = ratioPercent >= 60 ? 'Strong' : ratioPercent >= 40 ? 'Adequate' : 'Needs Work'
  const ratioColor = ratioPercent >= 60 ? 'text-emerald-600' : ratioPercent >= 40 ? 'text-amber-600' : 'text-red-600'

  const distribution = [
    { type: 'open-ended', count: data.openEndedCount, label: 'Open-ended' },
    { type: 'follow-up', count: data.followUpCount, label: 'Follow-up' },
    { type: 'closed', count: data.closedCount, label: 'Closed' },
    { type: 'leading', count: data.leadingCount, label: 'Leading' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircleQuestion className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Question Strategy</h3>
        <span className={`ml-auto text-xs font-semibold ${ratioColor}`}>
          {ratioLabel} ({ratioPercent}% open)
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {data.totalQuestions} questions during history-taking. Open-ended and follow-up questions yield richer clinical data.
      </p>

      {/* Distribution bars */}
      <div className="space-y-2 mb-4">
        {distribution.map(({ type, count, label }) => (
          <div key={type} className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 w-20 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${BAR_COLORS[type]}`}
                style={{ width: `${data.totalQuestions > 0 ? (count / data.totalQuestions) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-6 text-right tabular-nums">{count}</span>
          </div>
        ))}
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {data.strengths.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-emerald-700 mb-1">Strengths</div>
            <ul className="space-y-1">
              {data.strengths.map((s, i) => (
                <li key={i} className="text-xs text-emerald-800">• {s}</li>
              ))}
            </ul>
          </div>
        )}
        {data.improvements.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-700 mb-1">Try Next Time</div>
            <ul className="space-y-1">
              {data.improvements.map((s, i) => (
                <li key={i} className="text-xs text-amber-800">• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Example questions */}
      {data.exampleQuestions.length > 0 && (
        <>
          <button
            onClick={() => setShowExamples((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:text-[#002580] transition-colors"
          >
            {showExamples ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {showExamples ? 'Hide examples' : 'Show question examples'}
          </button>

          {showExamples && (
            <div className="mt-3 space-y-2">
              {data.exampleQuestions.map((eq, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${TYPE_COLORS[eq.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {eq.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 italic">&ldquo;{eq.question}&rdquo;</p>
                  {eq.suggestion && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-[#0033A0]">
                      <ArrowRight className="size-3 shrink-0 mt-0.5" />
                      <span>{eq.suggestion}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
