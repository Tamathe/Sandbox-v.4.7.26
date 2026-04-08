'use client'

import { useState } from 'react'
import { Route, ChevronDown, ChevronRight, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { ClinicalReasoningProcess } from '../../lib/virtual-clinic/types'

const TRAJECTORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; description: string }> = {
  convergent: {
    label: 'Convergent',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    description: 'Systematically narrowed from broad to specific',
  },
  divergent: {
    label: 'Divergent',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    description: 'Appropriately expanded when initial hypothesis was wrong',
  },
  scattered: {
    label: 'Scattered',
    color: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-200',
    description: 'Jumped between hypotheses without systematic narrowing',
  },
  linear: {
    label: 'Linear',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    description: 'Followed a single path without considering alternatives',
  },
}

const OUTCOME_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  refined: { icon: TrendingUp, color: 'text-blue-600', label: 'Refined' },
  confirmed: { icon: TrendingUp, color: 'text-emerald-600', label: 'Confirmed' },
  abandoned: { icon: TrendingDown, color: 'text-amber-600', label: 'Abandoned' },
}

export default function ClinicalReasoningCard({ data }: { data: ClinicalReasoningProcess }) {
  const [showPivots, setShowPivots] = useState(false)

  const trajectory = TRAJECTORY_CONFIG[data.trajectory] ?? TRAJECTORY_CONFIG.linear

  const efficiencyLabel = data.efficiencyScore >= 80 ? 'Efficient' : data.efficiencyScore >= 60 ? 'Moderate' : data.efficiencyScore >= 40 ? 'Inefficient' : 'Unfocused'
  const efficiencyColor = data.efficiencyScore >= 80 ? 'text-emerald-600' : data.efficiencyScore >= 60 ? 'text-blue-600' : data.efficiencyScore >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Route className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Clinical Reasoning Process</h3>
        <span className={`ml-auto text-xs font-semibold ${efficiencyColor}`}>
          {efficiencyLabel} ({data.efficiencyScore}/100)
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        How your diagnostic thinking evolved during the encounter.
      </p>

      {/* Trajectory badge + description */}
      <div className={`${trajectory.bg} ${trajectory.border} border rounded-xl p-3 mb-4`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${trajectory.bg} ${trajectory.color}`}>
            {trajectory.label} Reasoning
          </span>
        </div>
        <p className="text-xs text-gray-700">{data.trajectoryDescription}</p>
      </div>

      {/* Hypothesis Evolution Timeline */}
      {data.hypothesisEvolution.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">Reasoning Arc</div>
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-[#0033A0]/20" />
            {data.hypothesisEvolution.map((step, i) => (
              <div key={i} className="relative flex items-start gap-2.5 pb-2.5 last:pb-0">
                <div className={`absolute left-[-13px] top-1.5 size-2 rounded-full shrink-0 ${
                  i === data.hypothesisEvolution.length - 1 ? 'bg-[#0033A0]' : 'bg-[#0033A0]/40'
                }`} />
                <p className="text-xs text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Efficiency explanation */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-semibold text-gray-700">Diagnostic Efficiency</div>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.efficiencyScore >= 80 ? 'bg-emerald-500' : data.efficiencyScore >= 60 ? 'bg-blue-500' : data.efficiencyScore >= 40 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${data.efficiencyScore}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 tabular-nums">{data.efficiencyScore}</span>
        </div>
        <p className="text-xs text-gray-600">{data.efficiencyExplanation}</p>
      </div>

      {/* Diagnostic Pivots (collapsible) */}
      {data.pivots.length > 0 && (
        <>
          <button
            onClick={() => setShowPivots((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0033A0] hover:text-[#002580] transition-colors"
          >
            {showPivots ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {showPivots ? 'Hide diagnostic pivots' : `Show ${data.pivots.length} diagnostic pivot${data.pivots.length !== 1 ? 's' : ''}`}
          </button>

          {showPivots && (
            <div className="mt-3 space-y-2">
              {data.pivots.map((pivot, i) => {
                const outcome = OUTCOME_CONFIG[pivot.outcome] ?? OUTCOME_CONFIG.refined
                const OutcomeIcon = outcome.icon
                return (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                        {pivot.phase.replace(/_/g, ' ')}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-semibold ${outcome.color}`}>
                        <OutcomeIcon className="size-3" />
                        {outcome.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium mb-1">{pivot.hypothesis}</p>
                    <div className="flex items-start gap-1.5 text-xs text-gray-500">
                      <ArrowRight className="size-3 shrink-0 mt-0.5" />
                      <span>Triggered by: {pivot.trigger}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
