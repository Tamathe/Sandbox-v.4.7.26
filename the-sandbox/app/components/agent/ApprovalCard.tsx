'use client'

import { useState } from 'react'
import { ShieldCheck, Pencil, X } from 'lucide-react'
import type { ApprovalDecision } from '../../lib/agent/agent-types'

interface ApprovalCardProps {
  approvalId: string
  toolName: string
  description: string
  preview: Record<string, unknown>
  resolved: boolean
  resolvedDecision?: ApprovalDecision
  onDecision: (approvalId: string, decision: ApprovalDecision, editedArgs?: Record<string, unknown>) => void
}

/** Action card with a preview pane and Approve / Edit / Reject buttons. */
export default function ApprovalCard({
  approvalId,
  toolName,
  description,
  preview,
  resolved,
  resolvedDecision,
  onDecision,
}: ApprovalCardProps) {
  const [submitting, setSubmitting] = useState(false)

  const friendlyName = toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const handleDecision = (decision: ApprovalDecision) => {
    setSubmitting(true)
    onDecision(approvalId, decision)
  }

  if (resolved) {
    const labels: Record<ApprovalDecision, string> = {
      approved: 'Approved',
      rejected: 'Skipped',
      edited: 'Edited & Approved',
    }
    const colors: Record<ApprovalDecision, string> = {
      approved: 'text-green-600 bg-green-50 border-green-200',
      rejected: 'text-gray-500 bg-gray-50 border-gray-200',
      edited: 'text-blue-600 bg-blue-50 border-blue-200',
    }
    const d = resolvedDecision || 'approved'
    return (
      <div className={`border rounded-xl px-3 py-2 text-xs font-medium ${colors[d]}`}>
        {friendlyName} — {labels[d]}
      </div>
    )
  }

  return (
    <div className="border-2 border-blue-200 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-blue-50 flex items-center gap-2">
        <ShieldCheck className="size-4 text-[#0033A0]" />
        <span className="text-xs font-semibold text-gray-800">Sandy wants to: {description}</span>
      </div>

      {/* Preview pane */}
      <div className="px-3 py-2 border-t border-blue-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Preview — {friendlyName}</p>
        <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 overflow-x-auto max-h-40">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2 border-t border-blue-100 flex items-center gap-2">
        <button
          onClick={() => handleDecision('approved')}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#0033A0] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <ShieldCheck className="size-3.5" />
          Approve
        </button>
        <button
          onClick={() => handleDecision('edited')}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
        <button
          onClick={() => handleDecision('rejected')}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-500 text-xs font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <X className="size-3.5" />
          Skip
        </button>
      </div>
    </div>
  )
}
