'use client'

import { Check, Loader2, Minus, Pencil, Plus } from 'lucide-react'
import type { CourseMapWeek, DiffStatus } from './types'
import { computeWeekDiff } from './types'

export function CourseMapDiffView({
  oldWeeks,
  newWeeks,
  onConfirm,
  onCancel,
  confirming,
}: {
  oldWeeks: CourseMapWeek[]
  newWeeks: CourseMapWeek[]
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
}) {
  const diff = computeWeekDiff(oldWeeks, newWeeks)
  const added = diff.filter((d) => d.status === 'added').length
  const removed = diff.filter((d) => d.status === 'removed').length
  const modified = diff.filter((d) => d.status === 'modified').length

  const statusColor: Record<DiffStatus, string> = {
    added: 'border-emerald-300 bg-emerald-50',
    removed: 'border-red-300 bg-red-50',
    modified: 'border-amber-300 bg-amber-50',
    unchanged: 'border-gray-200 bg-white',
  }

  const statusLabel: Record<DiffStatus, string> = {
    added: 'New',
    removed: 'Removed',
    modified: 'Changed',
    unchanged: 'Unchanged',
  }

  const statusIcon: Record<DiffStatus, typeof Plus> = {
    added: Plus,
    removed: Minus,
    modified: Pencil,
    unchanged: Check,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-gray-900">
          Review Changes
          <span className="ml-2 text-sm font-normal text-amber-600">(New map will replace existing)</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {confirming ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Confirm New Map
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        {added > 0 && <span className="font-semibold text-emerald-700">{added} week{added > 1 ? 's' : ''} added</span>}
        {removed > 0 && <span className="font-semibold text-red-700">{removed} week{removed > 1 ? 's' : ''} removed</span>}
        {modified > 0 && <span className="font-semibold text-amber-700">{modified} week{modified > 1 ? 's' : ''} modified</span>}
        {added === 0 && removed === 0 && modified === 0 && <span className="text-gray-500">No changes detected</span>}
      </div>

      {/* Diff rows */}
      <div className="space-y-2">
        {diff.map((d, i) => {
          const Icon = statusIcon[d.status]
          const week = d.newWeek ?? d.oldWeek!
          return (
            <div key={i} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${statusColor[d.status]}`}>
              <Icon className="size-4 shrink-0" />
              <span className="rounded-full bg-[#0033A0] px-2.5 py-0.5 text-xs font-bold text-white">
                Week {week.weekNumber}
              </span>
              <span className="flex-1 text-sm font-semibold text-gray-900">{week.title}</span>
              <span className="text-xs text-gray-500">
                {week.objectives.length}O / {week.materials.length}M / {week.assignments.length}A
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                d.status === 'added' ? 'bg-emerald-100 text-emerald-700'
                : d.status === 'removed' ? 'bg-red-100 text-red-700'
                : d.status === 'modified' ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
              }`}>
                {statusLabel[d.status]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
