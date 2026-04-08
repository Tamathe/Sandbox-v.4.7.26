'use client'

import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { PeerReviewQuestion } from '../../lib/accreditation/types'

const difficultyColors: Record<string, string> = {
  routine: 'bg-green-100 text-green-800',
  probing: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
}

interface PeerReviewPrepPanelProps {
  questions: PeerReviewQuestion[]
  loading: boolean
}

export default function PeerReviewPrepPanel({ questions, loading }: PeerReviewPrepPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="size-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Click &quot;Generate Questions&quot; to simulate peer reviewer questions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="border-2 border-gray-200 rounded-2xl bg-white overflow-hidden">
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className="w-full text-left px-5 py-4 flex items-start justify-between hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">Std {q.standard}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColors[q.difficulty] ?? ''}`}>
                  {q.difficulty}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{q.question}</p>
            </div>
            {expandedIdx === idx ? <ChevronUp className="size-4 mt-1 shrink-0" /> : <ChevronDown className="size-4 mt-1 shrink-0" />}
          </button>

          {expandedIdx === idx && (
            <div className="border-t border-gray-200 px-5 py-4 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-1">Why They Would Ask This</h4>
                <p className="text-sm text-gray-600">{q.context}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-1">Suggested Response</h4>
                <p className="text-sm text-gray-700">{q.suggestedResponse}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
