'use client'

import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, Fingerprint, HelpCircle, EyeOff } from 'lucide-react'
import type { PlantedError } from '../../lib/output-eval-constants'

const ERROR_STYLES: Record<string, { bg: string; mark: string; label: string }> = {
  hallucination: { bg: 'bg-red-100 text-red-700 border-red-200', mark: 'bg-red-100/80', label: 'Hallucination' },
  bias: { bg: 'bg-purple-100 text-purple-700 border-purple-200', mark: 'bg-purple-100/80', label: 'Bias' },
  unsupported: { bg: 'bg-orange-100 text-orange-700 border-orange-200', mark: 'bg-orange-100/80', label: 'Unsupported' },
  missing_context: { bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', mark: 'bg-yellow-100/80', label: 'Missing Context' },
}

const ERROR_ICONS: Record<string, typeof AlertTriangle> = {
  hallucination: AlertTriangle,
  bias: Fingerprint,
  unsupported: HelpCircle,
  missing_context: EyeOff,
}

interface UserHighlight {
  span: string
  type: string
  explanation: string
}

interface Scores {
  detectionScore: number
  justificationScore: number
  overallScore: number
  feedback: string
}

interface Props {
  scores: Scores
  userHighlights: UserHighlight[]
  plantedErrors: PlantedError[]
  aiResponse: string
  onNext: () => void
}

function ScoreCard({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600'
  const bar = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="text-xs text-gray-500 uppercase font-semibold mb-2">{label}</div>
      <div className={`text-3xl font-extrabold ${color}`}>
        {value}<span className="text-lg text-gray-400">{suffix ?? '%'}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OutputEvalResults({ scores, userHighlights, plantedErrors, aiResponse, onNext }: Props) {
  return (
    <div className="space-y-6">
      {/* Score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreCard label="Detection" value={scores.detectionScore} max={100} />
        <ScoreCard label="Justification" value={scores.justificationScore} max={100} />
        <ScoreCard label="Overall" value={scores.overallScore} max={100} />
      </div>

      {/* Feedback */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <p className="text-sm text-gray-700">{scores.feedback}</p>
      </div>

      {/* Actual errors revealed */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h3 className="font-extrabold text-gray-900 mb-4">Actual Errors in the Response</h3>
        <div className="space-y-4">
          {plantedErrors.map((error, i) => {
            const style = ERROR_STYLES[error.type]
            const Icon = ERROR_ICONS[error.type]
            // Check if user found this error
            const found = userHighlights.some((h) => {
              const hNorm = h.span.toLowerCase().trim()
              const eNorm = error.span.toLowerCase().trim()
              return eNorm.includes(hNorm) || hNorm.includes(eNorm)
            })

            return (
              <div key={i} className={`p-4 rounded-xl border ${found ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {found ? (
                    <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-gray-600">
                    {found ? 'You found this!' : 'Missed'}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style?.bg ?? 'bg-gray-100 text-gray-600'}`}>
                    {Icon && <Icon className="size-3 inline mr-1" />}
                    {style?.label ?? error.type}
                  </span>
                </div>
                <p className="text-sm text-gray-700 italic mb-2 bg-white/60 rounded-lg p-2">&ldquo;{error.span}&rdquo;</p>
                <p className="text-sm text-gray-600"><span className="font-semibold">Why it&apos;s wrong:</span> {error.explanation}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Your highlights comparison */}
      {userHighlights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="font-extrabold text-gray-900 mb-4">Your Highlights</h3>
          <div className="space-y-3">
            {userHighlights.map((h, i) => {
              const style = ERROR_STYLES[h.type]
              return (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style?.bg ?? 'bg-gray-100 text-gray-600'}`}>
                      {style?.label ?? h.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 italic">&ldquo;{h.span}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-1">{h.explanation}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] transition-colors"
      >
        Next Scenario <ArrowRight className="size-4" />
      </button>
    </div>
  )
}
