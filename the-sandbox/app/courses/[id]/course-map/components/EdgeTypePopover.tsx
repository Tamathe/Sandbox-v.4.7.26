'use client'

import { useEffect } from 'react'

export default function EdgeTypePopover({
  position,
  onSelect,
  onCancel,
}: {
  position: { x: number; y: number }
  onSelect: (edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT') => void
  onCancel: () => void
}) {
  const types: Array<{ value: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'; label: string; color: string }> = [
    { value: 'PREREQUISITE', label: 'Prerequisite', color: '#dc2626' },
    { value: 'SEQUENCE', label: 'Sequence', color: '#2563eb' },
    { value: 'CONCURRENT', label: 'Concurrent', color: '#9333ea' },
  ]

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      className="absolute z-50 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-2 space-y-1"
      style={{ left: position.x, top: position.y }}
    >
      <p className="text-xs font-semibold text-gray-500 px-2 py-1">Edge Type</p>
      {types.map((t) => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors text-left"
        >
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: t.color }} />
          {t.label}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="w-full px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition-colors text-center"
      >
        Cancel
      </button>
    </div>
  )
}
