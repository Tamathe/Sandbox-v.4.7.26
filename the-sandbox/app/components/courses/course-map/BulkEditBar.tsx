'use client'

import { Calendar, MoveRight, Trash2 } from 'lucide-react'
import type { CourseMapWeek } from './types'

interface BulkEditBarProps {
  bulkSelectMode: boolean
  selectedWeeks: Set<number>
  weeks: CourseMapWeek[]
  bulkShiftDays: number
  bulkTargetWeek: number | null
  showBulkDeleteConfirm: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onSetBulkShiftDays: (days: number) => void
  onBulkShiftDates: () => void
  onSetBulkTargetWeek: (week: number | null) => void
  onBulkMoveMaterials: () => void
  onSetShowBulkDeleteConfirm: (show: boolean) => void
  onBulkDelete: () => void
}

export function BulkSelectControls({ bulkSelectMode, selectedWeeks, onSelectAll, onDeselectAll }: {
  bulkSelectMode: boolean
  selectedWeeks: Set<number>
  onSelectAll: () => void
  onDeselectAll: () => void
}) {
  if (!bulkSelectMode) return null
  return (
    <div className="flex items-center gap-3 text-xs">
      <button
        type="button"
        onClick={onSelectAll}
        className="font-semibold text-[#0033A0] hover:underline"
      >
        Select All
      </button>
      <button
        type="button"
        onClick={onDeselectAll}
        className="font-semibold text-gray-500 hover:underline"
      >
        Deselect All
      </button>
      <span className="text-gray-400">{selectedWeeks.size} selected</span>
    </div>
  )
}

export function BulkEditBar(props: BulkEditBarProps) {
  const {
    bulkSelectMode, selectedWeeks, weeks, bulkShiftDays, bulkTargetWeek,
    showBulkDeleteConfirm,
    onSetBulkShiftDays, onBulkShiftDates, onSetBulkTargetWeek,
    onBulkMoveMaterials, onSetShowBulkDeleteConfirm, onBulkDelete,
  } = props

  if (!bulkSelectMode || selectedWeeks.size < 1) return null

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-[#0033A0] bg-white px-4 py-3 shadow-lg">
      <span className="text-sm font-bold text-gray-800">{selectedWeeks.size} week{selectedWeeks.size > 1 ? 's' : ''} selected</span>
      <div className="h-5 w-px bg-gray-200" />
      {/* Shift Dates */}
      <div className="flex items-center gap-1.5">
        <Calendar className="size-3.5 text-gray-500" />
        <input
          type="number"
          value={bulkShiftDays}
          onChange={(e) => onSetBulkShiftDays(Number(e.target.value))}
          className="w-16 rounded border border-gray-200 px-2 py-1 text-xs"
          placeholder="Days"
        />
        <button
          type="button"
          onClick={onBulkShiftDates}
          disabled={bulkShiftDays === 0}
          className="rounded-lg bg-[#0033A0] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#002580] disabled:opacity-50"
        >
          Shift Dates
        </button>
      </div>
      <div className="h-5 w-px bg-gray-200" />
      {/* Move Materials */}
      <div className="flex items-center gap-1.5">
        <MoveRight className="size-3.5 text-gray-500" />
        <select
          value={bulkTargetWeek ?? ''}
          onChange={(e) => onSetBulkTargetWeek(e.target.value ? Number(e.target.value) : null)}
          className="rounded border border-gray-200 px-2 py-1 text-xs"
        >
          <option value="">Target week...</option>
          {weeks.filter((w) => !selectedWeeks.has(w.weekNumber)).map((w) => (
            <option key={w.weekNumber} value={w.weekNumber}>Week {w.weekNumber}: {w.title}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onBulkMoveMaterials}
          disabled={bulkTargetWeek === null}
          className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Move Materials
        </button>
      </div>
      <div className="h-5 w-px bg-gray-200" />
      {/* Delete Selected */}
      {!showBulkDeleteConfirm ? (
        <button
          type="button"
          onClick={() => onSetShowBulkDeleteConfirm(true)}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          <Trash2 className="inline size-3 mr-1" />
          Delete Selected
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-red-600 font-semibold">Confirm?</span>
          <button
            type="button"
            onClick={onBulkDelete}
            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => onSetShowBulkDeleteConfirm(false)}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
