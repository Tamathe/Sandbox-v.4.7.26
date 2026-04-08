'use client'

import { Check, Clock, Users, X } from 'lucide-react'

interface FloatingBatchBarProps {
  selectedCount: number
  hasAuditSensitive: boolean
  onApproveAll: () => void
  onSnooze: () => void
  onDelegate: () => void
  onClear: () => void
  disabled?: boolean
}

export default function FloatingBatchBar({
  selectedCount,
  hasAuditSensitive,
  onApproveAll,
  onSnooze,
  onDelegate,
  onClear,
  disabled,
}: FloatingBatchBarProps) {
  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-sm font-semibold text-gray-700">
        {selectedCount} selected
        {hasAuditSensitive && (
          <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            audit-sensitive
          </span>
        )}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onApproveAll}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Check className="size-3.5" />
          Approve All
        </button>
        <button
          onClick={onSnooze}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          <Clock className="size-3.5" />
          Snooze 24h
        </button>
        <button
          onClick={onDelegate}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0033A0] text-white text-xs font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
        >
          <Users className="size-3.5" />
          Delegate
        </button>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
        >
          <X className="size-3.5" />
          Clear
        </button>
      </div>
    </div>
  )
}
