'use client'

import { Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { AnswerAnnotation } from '../../../lib/crisis-comms/spokesperson-trainer/types'

const RATING_CONFIG = {
  strong: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Strong' },
  adequate: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Adequate' },
  weak: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Weak' },
}

interface ReplayPanelProps {
  annotations: AnswerAnnotation[]
  loading: boolean
  keyMessages: string[]
}

export default function ReplayPanel({ annotations, loading, keyMessages }: ReplayPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="size-6 text-[#0033A0] animate-spin" />
        <p className="text-sm text-gray-500">Analyzing your answers...</p>
      </div>
    )
  }

  if (annotations.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No interview exchanges found to annotate.
      </div>
    )
  }

  const strongCount = annotations.filter((a) => a.rating === 'strong').length
  const weakCount = annotations.filter((a) => a.rating === 'weak').length

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{annotations.length} answers reviewed</span>
        <span className="text-green-600 font-medium">{strongCount} strong</span>
        <span className="text-red-600 font-medium">{weakCount} weak</span>
      </div>

      {/* Key messages summary */}
      {keyMessages.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <h4 className="text-xs font-bold text-[#0033A0] uppercase tracking-wide mb-2">Key Message Delivery</h4>
          {keyMessages.map((msg, i) => {
            const landed = annotations.some((a) => a.keyMessagesLanded.includes(msg))
            return (
              <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                {landed ? (
                  <CheckCircle className="size-3.5 text-green-600" />
                ) : (
                  <XCircle className="size-3.5 text-red-500" />
                )}
                <span className={landed ? 'text-gray-800' : 'text-gray-500 line-through'}>
                  {msg}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Per-answer annotations */}
      <div className="space-y-2">
        {annotations.map((annotation) => {
          const config = RATING_CONFIG[annotation.rating]
          const Icon = config.icon
          const isExpanded = expandedIndex === annotation.questionIndex

          return (
            <div
              key={annotation.questionIndex}
              className={`border rounded-xl overflow-hidden transition-colors ${config.bg}`}
            >
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : annotation.questionIndex)}
                className="w-full px-4 py-3 flex items-start gap-3 text-left"
              >
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-gray-400">Q{annotation.questionIndex + 1}</span>
                  <Icon className={`size-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {annotation.reporterQuestion}
                  </p>
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{annotation.note}</p>
                  )}
                </div>
                <div className="shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-current/10">
                  <div className="pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reporter</p>
                    <p className="text-sm text-gray-700 italic">&ldquo;{annotation.reporterQuestion}&rdquo;</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Answer</p>
                    <p className="text-sm text-gray-700">&ldquo;{annotation.userAnswer}&rdquo;</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Coach Note</p>
                    <p className="text-sm text-gray-800">{annotation.note}</p>
                  </div>
                  {annotation.techniques.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {annotation.techniques.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-current/20 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {annotation.keyMessagesLanded.length > 0 && (
                    <div className="text-xs text-green-700">
                      Landed: {annotation.keyMessagesLanded.join(', ')}
                    </div>
                  )}
                  {annotation.keyMessagesMissed.length > 0 && (
                    <div className="text-xs text-red-600">
                      Missed opportunity: {annotation.keyMessagesMissed.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
