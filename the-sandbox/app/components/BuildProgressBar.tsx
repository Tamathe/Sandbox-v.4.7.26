'use client'

import { Check } from 'lucide-react'

export type BuildStep = 'describe' | 'refine' | 'review' | 'publish'

const STEPS: { id: BuildStep; label: string }[] = [
  { id: 'describe', label: 'Describe' },
  { id: 'refine', label: 'Refine' },
  { id: 'review', label: 'Review' },
  { id: 'publish', label: 'Publish' },
]

const STEP_INDEX: Record<BuildStep, number> = {
  describe: 0,
  refine: 1,
  review: 2,
  publish: 3,
}

interface BuildProgressBarProps {
  currentStep: BuildStep
}

export default function BuildProgressBar({ currentStep }: BuildProgressBarProps) {
  const currentIdx = STEP_INDEX[currentStep]

  return (
    <div className="flex items-center gap-1 w-full max-w-md" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={4}>
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx
        const isCurrent = i === currentIdx
        const isFuture = i > currentIdx

        return (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            {/* Step circle + label */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className={`flex items-center justify-center size-6 rounded-full text-xs font-bold transition-colors ${
                  isComplete
                    ? 'bg-[#0033A0] text-white'
                    : isCurrent
                      ? 'bg-[#0033A0] text-white ring-2 ring-[#0033A0]/30'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isComplete ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  isCurrent ? 'text-[#0033A0]' : isComplete ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1">
                <div
                  className={`h-full rounded-full transition-colors ${
                    isFuture ? 'bg-gray-200' : 'bg-[#0033A0]'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
