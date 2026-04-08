'use client'

import { CheckCircle, Circle, Clock } from 'lucide-react'
import { PETITION_STATUS_LABELS } from '../../lib/registrar/types'

const STEPS = [
  'SUBMITTED',
  'ELIGIBILITY_CHECKING',
  'IN_REVIEW',
  'APPROVED',
] as const

type PetitionStatus = 'SUBMITTED' | 'ELIGIBILITY_CHECKING' | 'PENDING_STUDENT_INFO' | 'IN_REVIEW' | 'APPROVED' | 'DENIED' | 'WITHDRAWN'

interface PetitionStatusTrackerProps {
  status: PetitionStatus
}

export function PetitionStatusTracker({ status }: PetitionStatusTrackerProps) {
  if (status === 'WITHDRAWN') {
    return (
      <div className="flex items-center gap-2 py-3">
        <Circle className="size-4 text-gray-400" />
        <span className="text-sm text-gray-500">Petition Withdrawn</span>
      </div>
    )
  }

  if (status === 'DENIED') {
    return (
      <div className="flex items-center gap-2 py-3">
        <Circle className="size-4 text-red-500" />
        <span className="text-sm text-red-600 font-medium">Petition Denied</span>
      </div>
    )
  }

  const currentIdx = STEPS.indexOf(status as never) ?? 0
  const effectiveIdx = status === 'PENDING_STUDENT_INFO' ? 2 : currentIdx

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isComplete = i < effectiveIdx
        const isCurrent = i === effectiveIdx
        const isFuture = i > effectiveIdx

        return (
          <div key={step} className="flex items-center">
            {/* Node */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`size-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isComplete
                    ? 'bg-[#0033A0] border-[#0033A0]'
                    : isCurrent
                      ? 'bg-white border-[#0033A0]'
                      : 'bg-white border-gray-300'
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="size-3.5 text-white" />
                ) : isCurrent ? (
                  <Clock className="size-3.5 text-[#0033A0]" />
                ) : (
                  <Circle className="size-3.5 text-gray-300" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium text-center max-w-[60px] leading-tight ${
                  isComplete || isCurrent ? 'text-[#0033A0]' : isFuture ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {PETITION_STATUS_LABELS[step]}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mb-4 ${i < effectiveIdx ? 'bg-[#0033A0]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
