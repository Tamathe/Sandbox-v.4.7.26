'use client'

import { AlertTriangle } from 'lucide-react'
import { ModalShell } from '../ui/ModalShell'

interface BatchConfirmModalProps {
  action: 'approve' | 'snooze' | 'delegate'
  count: number
  sensitiveCount: number
  onConfirm: () => void
  onCancel: () => void
}

const ACTION_CONFIG = {
  approve: { label: 'Approve', color: 'bg-emerald-600 hover:bg-emerald-700' },
  snooze: { label: 'Snooze', color: 'bg-amber-500 hover:bg-amber-600' },
  delegate: { label: 'Delegate', color: 'bg-[#0033A0] hover:bg-[#002580]' },
} as const

export default function BatchConfirmModal({ action, count, sensitiveCount, onConfirm, onCancel }: BatchConfirmModalProps) {
  const config = ACTION_CONFIG[action]

  return (
    <ModalShell title={`Confirm Batch ${config.label}`} onClose={onCancel} maxWidth="sm">
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-700">
            {config.label} <span className="font-bold">{count}</span> item{count !== 1 ? 's' : ''}?
          </p>

          {sensitiveCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                This includes <span className="font-bold">{sensitiveCount}</span> audit-sensitive item{sensitiveCount !== 1 ? 's' : ''} that will be logged.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors ${config.color}`}
            >
              {config.label} {count} item{count !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
    </ModalShell>
  )
}
