'use client'

import { Clock, AlertTriangle, TrendingUp } from 'lucide-react'

interface TimelineEstimate {
  program: string
  programName: string
  creditsCompleted: number
  creditsRemaining: number
  estimatedSemesters: number
  estimatedGraduation: string
  bottleneck: string | null
}

interface TimelineComparisonProps {
  current: TimelineEstimate
  target: TimelineEstimate
  deltaSemesters: number
  deltaCredits: number
  recommendation: string
}

function TimelineBar({
  estimate,
  label,
  maxSemesters,
  variant,
}: {
  estimate: TimelineEstimate
  label: string
  maxSemesters: number
  variant: 'current' | 'target'
}) {
  const pct = maxSemesters > 0
    ? Math.round(((maxSemesters - estimate.estimatedSemesters) / maxSemesters) * 100)
    : 100

  const barColor = variant === 'current' ? 'bg-emerald-500' : 'bg-[#0033A0]'
  const totalCredits = estimate.creditsCompleted + estimate.creditsRemaining

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-bold text-gray-900">{estimate.programName}</span>
          <span className="text-xs text-gray-400 ml-2">({label})</span>
        </div>
        <span className="text-sm font-extrabold text-gray-900">
          {estimate.estimatedGraduation}
        </span>
      </div>

      <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {estimate.creditsCompleted}/{totalCredits} credits
          &middot; {estimate.creditsRemaining} remaining
        </span>
        <span className="font-semibold">
          {estimate.estimatedSemesters} semester{estimate.estimatedSemesters !== 1 ? 's' : ''} left
        </span>
      </div>

      {estimate.bottleneck && (
        <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200
                        rounded-lg px-3 py-2">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Bottleneck:</span> {estimate.bottleneck}
          </p>
        </div>
      )}
    </div>
  )
}

export default function TimelineComparison({
  current,
  target,
  deltaSemesters,
  deltaCredits,
  recommendation,
}: TimelineComparisonProps) {
  const maxSemesters = Math.max(current.estimatedSemesters, target.estimatedSemesters, 1)

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="size-5 text-[#0033A0]" />
        <h3 className="text-base font-extrabold text-gray-900">Graduation Timeline</h3>
      </div>

      <div className="space-y-3">
        <TimelineBar
          estimate={current}
          label="current"
          maxSemesters={maxSemesters}
          variant="current"
        />
        <TimelineBar
          estimate={target}
          label="exploring"
          maxSemesters={maxSemesters}
          variant="target"
        />
      </div>

      {/* Delta summary */}
      <div className="mt-4 flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
        <TrendingUp className={`size-5 shrink-0 ${deltaSemesters > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
        <div className="text-sm">
          <span className="font-bold text-gray-900">
            {deltaSemesters > 0 ? '+' : ''}{deltaSemesters} semester{Math.abs(deltaSemesters) !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-500 ml-1">
            &middot; {deltaCredits > 0 ? '+' : ''}{deltaCredits} credits
          </span>
        </div>
      </div>

      {/* Sandy recommendation */}
      {recommendation && (
        <div className="mt-4 flex items-start gap-3 bg-[#0033A0]/5 rounded-xl
                        border border-[#0033A0]/10 px-4 py-3">
          <div className="size-7 rounded-full bg-[#0033A0] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{recommendation}</p>
        </div>
      )}
    </div>
  )
}
