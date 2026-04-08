'use client'

import { useCallback } from 'react'

interface ChipBarProps {
  chips: string[]
  onSelect: (chip: string) => void
  disabled?: boolean
}

export default function ChipBar({ chips, onSelect, disabled }: ChipBarProps) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-1">
      {chips.map((chip) => (
        <ChipButton key={chip} label={chip} onSelect={onSelect} disabled={disabled} />
      ))}
    </div>
  )
}

function ChipButton({ label, onSelect, disabled }: { label: string; onSelect: (chip: string) => void; disabled?: boolean }) {
  const handleClick = useCallback(() => {
    if (!disabled) onSelect(label)
  }, [label, onSelect, disabled])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border border-[#0033A0]/30 text-[#0033A0] bg-white hover:bg-[#0033A0]/5 hover:border-[#0033A0]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {label}
    </button>
  )
}
