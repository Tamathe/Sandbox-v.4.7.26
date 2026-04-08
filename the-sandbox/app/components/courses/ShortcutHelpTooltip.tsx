'use client'

import { X } from 'lucide-react'

interface ShortcutHelpTooltipProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { keys: 'g → o', action: 'Overview' },
  { keys: 'g → a', action: 'Assignments' },
  { keys: 'g → g', action: 'Grades' },
  { keys: 'g → c', action: 'Content' },
  { keys: 'g → m', action: 'Course Map' },
  { keys: 'g → d', action: 'Discussion' },
  { keys: 'g → s', action: 'Settings' },
  { keys: '[', action: 'Previous course' },
  { keys: ']', action: 'Next course' },
  { keys: '?', action: 'Toggle this help' },
]

export default function ShortcutHelpTooltip({ open, onClose }: ShortcutHelpTooltipProps) {
  if (!open) return null

  return (
    <div className="fixed bottom-4 right-4 z-30 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-extrabold text-gray-900">Keyboard Shortcuts</h4>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="contents">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
              {s.keys}
            </kbd>
            <span className="text-[10px] text-gray-500">{s.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
