'use client'

import React, { useState } from 'react'
import { Clock, Check } from 'lucide-react'

interface MeetingOption {
  index: number
  start: string
  end: string
  label: string
}

interface Props {
  options: MeetingOption[]
  onSelect: (option: MeetingOption) => void
}

export default function AssistantMeetingOptions({ options, onSelect }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  const handleSelect = (option: MeetingOption) => {
    setSelected(option.index)
    onSelect(option)
  }

  return (
    <div className="rounded-2xl border-2 border-[#0033A0]/20 bg-white p-3 my-2">
      <p className="text-xs font-bold text-[#0033A0] uppercase tracking-wide mb-2">
        Available Times
      </p>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const isSelected = selected === opt.index
          return (
            <button
              key={opt.index}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={`w-full flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : selected !== null
                    ? 'border-gray-200 bg-gray-50 opacity-50'
                    : 'border-gray-200 bg-white hover:border-[#0033A0]/40 hover:bg-blue-50/50'
              }`}
            >
              {isSelected ? (
                <Check className="size-4 text-green-600 shrink-0" />
              ) : (
                <Clock className="size-4 text-[#0033A0] shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-800">Option {opt.index}</p>
                <p className="text-xs text-gray-500">{opt.label}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
