'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface RequirementResult {
  requirementName: string
  category: string
  status: 'SATISFIED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'DEFICIENT'
  creditsRequired: number
  creditsCompleted: number
  creditsInProgress: number
  satisfyingCourses: string[]
  missingSuggestions: string[]
}

interface RequirementComparisonProps {
  requirements: RequirementResult[]
  programName: string
}

const STATUS_CONFIG = {
  SATISFIED: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500',
    label: 'Complete',
  },
  IN_PROGRESS: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-500',
    label: 'In Progress',
  },
  NOT_STARTED: {
    icon: AlertCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-300',
    label: 'Not Started',
  },
  DEFICIENT: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-500',
    label: 'Deficient',
  },
}

function RequirementRow({ req }: { req: RequirementResult }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[req.status]
  const Icon = config.icon
  const pct = req.creditsRequired > 0
    ? Math.min(100, Math.round((req.creditsCompleted / req.creditsRequired) * 100))
    : 0

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50
                   transition-colors text-left"
      >
        <Icon className={`size-4 ${config.color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-gray-900">{req.category}</span>
            <span className="text-xs text-gray-400 shrink-0">
              {req.creditsCompleted}/{req.creditsRequired} credits
            </span>
          </div>
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${config.bg}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {(req.satisfyingCourses.length > 0 || req.missingSuggestions.length > 0) && (
          expanded ? (
            <ChevronUp className="size-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-gray-400 shrink-0" />
          )
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-3 space-y-2">
          {req.requirementName !== req.category && (
            <p className="text-xs text-gray-500">{req.requirementName}</p>
          )}

          {req.satisfyingCourses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 mb-1">Completed</p>
              <div className="flex flex-wrap gap-1.5">
                {req.satisfyingCourses.map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-emerald-50 text-emerald-700 rounded px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {req.missingSuggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 mb-1">Still Needed</p>
              <div className="flex flex-wrap gap-1.5">
                {req.missingSuggestions.map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-red-50 text-red-600 rounded px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RequirementComparison({
  requirements,
  programName,
}: RequirementComparisonProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <h3 className="text-base font-extrabold text-gray-900 mb-1">
        {programName} Requirements
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        {requirements.filter((r) => r.status === 'SATISFIED').length}/{requirements.length} requirement areas satisfied
      </p>

      <div className="space-y-2">
        {requirements.map((req) => (
          <RequirementRow key={req.requirementName} req={req} />
        ))}
      </div>
    </div>
  )
}
