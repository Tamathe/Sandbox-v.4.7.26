'use client'

import { CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

export interface ApprovalStepData {
  id: string
  stepOrder: number
  approverEmail: string
  approverLabel: string
  status: string // 'pending' | 'approved' | 'rejected'
  comment: string | null
  decidedAt: string | null
  createdAt: string
}

interface ApprovalTimelineProps {
  steps: ApprovalStepData[]
  currentUserEmail?: string
  onApprove?: (stepId: string) => void
  onReject?: (stepId: string, comment: string) => void
  loading?: boolean
}

// ── Component ────────────────────────────────────────────────

export default function ApprovalTimeline({
  steps,
  currentUserEmail,
  onApprove,
  onReject,
  loading,
}: ApprovalTimelineProps) {
  if (steps.length === 0) return null

  // Find the first pending step (the current active one)
  const activeStepIndex = steps.findIndex((s) => s.status === 'pending')

  return (
    <div className="space-y-1">
      <span className="text-xs font-bold text-gray-600 block mb-3">Approval Workflow</span>

      {/* Horizontal step indicators */}
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, i) => {
          const isActive = i === activeStepIndex
          const isApproved = step.status === 'approved'
          const isRejected = step.status === 'rejected'
          const isFuture = step.status === 'pending' && i !== activeStepIndex

          return (
            <div key={step.id} className="flex items-center gap-1">
              {/* Step pill */}
              <div
                className={`
                  flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all
                  ${isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                  ${isRejected ? 'bg-red-50 text-red-700 border-red-200' : ''}
                  ${isActive ? 'bg-blue-50 text-[#0033A0] border-[#0033A0]/30 ring-2 ring-[#0033A0]/10' : ''}
                  ${isFuture ? 'bg-gray-50 text-gray-400 border-gray-200' : ''}
                `}
              >
                {isApproved && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                {isRejected && <XCircle className="size-3.5 text-red-600" />}
                {isActive && <Clock className="size-3.5 text-[#0033A0] animate-pulse" />}
                {isFuture && <Clock className="size-3.5 text-gray-400" />}
                {step.approverLabel}
              </div>

              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <ArrowRight className="size-3.5 text-gray-300 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Step details */}
      <div className="mt-3 space-y-2">
        {steps.map((step, i) => {
          const isActive = i === activeStepIndex
          const isApproved = step.status === 'approved'
          const isRejected = step.status === 'rejected'
          const isCurrentApprover =
            isActive &&
            currentUserEmail &&
            step.approverEmail.toLowerCase() === currentUserEmail.toLowerCase()

          return (
            <div
              key={step.id}
              className={`
                flex items-start justify-between gap-3 text-xs rounded-lg px-3 py-2
                ${isActive ? 'bg-blue-50/50 border border-[#0033A0]/10' : ''}
                ${isApproved ? 'bg-emerald-50/30' : ''}
                ${isRejected ? 'bg-red-50/30' : ''}
              `}
            >
              <div className="min-w-0">
                <span className="font-semibold text-gray-700">{step.approverLabel}</span>
                <span className="text-gray-400 ml-1.5">{step.approverEmail}</span>
                {step.decidedAt && (
                  <span className="text-gray-400 ml-1.5">
                    — {new Date(step.decidedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {step.comment && isRejected && (
                  <p className="text-red-600 mt-0.5">Revision requested: {step.comment}</p>
                )}
                {step.comment && isApproved && step.comment !== 'Auto-approved (submitter is approver)' && (
                  <p className="text-emerald-600 mt-0.5">{step.comment}</p>
                )}
              </div>

              {/* Action buttons for current approver */}
              {isCurrentApprover && onApprove && onReject && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onApprove(step.id)}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const comment = window.prompt('Reason for requesting revisions:')
                      if (comment) onReject(step.id, comment)
                    }}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="size-3.5" />
                    Request Revisions
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
