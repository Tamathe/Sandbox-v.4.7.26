'use client'

import { Bell, Check, Loader2, X } from 'lucide-react'
import type { ViewState } from './types'

interface BottomConfirmBarProps {
  viewState: ViewState
  editing: boolean
  isStudent: boolean
  confirming: boolean
  weeksLength: number
  notifyStudents: boolean
  notifyResult: number | null
  onSetNotifyStudents: (v: boolean) => void
  onSetNotifyResult: (v: number | null) => void
  onCancelEdit: () => void
  onConfirm: () => void
}

export function BottomConfirmBar({
  viewState, editing, isStudent, confirming, weeksLength,
  notifyStudents, notifyResult,
  onSetNotifyStudents, onSetNotifyResult, onCancelEdit, onConfirm,
}: BottomConfirmBarProps) {
  return (
    <>
      {(viewState === 'preview' || editing) && weeksLength > 0 && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {/* Notify toggle */}
          {!isStudent && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={notifyStudents}
                onChange={(e) => onSetNotifyStudents(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Bell className="size-3.5 text-gray-400" />
              Notify enrolled students
            </label>
          )}
          <div className="flex items-center justify-end gap-3">
            {editing && viewState === 'saved' && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {confirming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Confirm & Save
            </button>
          </div>
        </div>
      )}

      {/* Notification sent result */}
      {notifyResult !== null && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Bell className="size-4 shrink-0" />
          Notifications sent to {notifyResult} student{notifyResult !== 1 ? 's' : ''}
          <button type="button" onClick={() => onSetNotifyResult(null)} className="ml-auto">
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  )
}
