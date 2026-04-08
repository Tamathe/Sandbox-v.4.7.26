'use client'

import { useState } from 'react'
import type { AIStance } from '../../generated/prisma'
import StanceDetailCard from './StanceDetailCard'

interface StanceSpectrumProps {
  currentStance: AIStance | null
  onSelectStance?: (stance: AIStance) => void
  interactive?: boolean
}

const STANCES: { key: AIStance; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'PROHIBIT', label: 'Prohibit', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300' },
  { key: 'CAUTIOUS', label: 'Cautious', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' },
  { key: 'GUIDED', label: 'Guided', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
  { key: 'INTEGRATE', label: 'Integrate', color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-300' },
  { key: 'REQUIRE', label: 'Require', color: 'text-purple-700', bgColor: 'bg-purple-100', borderColor: 'border-purple-300' },
]

export default function StanceSpectrum({ currentStance, onSelectStance, interactive = false }: StanceSpectrumProps) {
  const [expandedStance, setExpandedStance] = useState<AIStance | null>(null)

  function handleClick(stance: AIStance) {
    if (expandedStance === stance) {
      setExpandedStance(null)
    } else {
      setExpandedStance(stance)
    }
  }

  return (
    <div className="space-y-6">
      {/* Spectrum bar */}
      <div className="relative">
        {/* Continuous connector line */}
        <div className="absolute top-[22px] left-[10%] right-[10%] h-1 bg-gray-200 rounded-full" />
        <div className="relative flex items-start justify-between">
          {STANCES.map((s) => {
            const isActive = currentStance === s.key
            const isExpanded = expandedStance === s.key
            const anotherIsExpanded = expandedStance !== null && expandedStance !== s.key
            return (
              <div key={s.key} className="flex flex-col items-center" style={{ width: '20%' }}>
                <button
                  onClick={() => handleClick(s.key)}
                  className={`relative size-11 rounded-full border-2 transition-all ${
                    isExpanded
                      ? `${s.bgColor} ${s.borderColor} ring-2 ring-offset-2 ring-[#0033A0]`
                      : isActive && !anotherIsExpanded
                        ? `${s.bgColor} ${s.borderColor} ring-2 ring-offset-2 ring-[#0033A0]`
                        : isActive && anotherIsExpanded
                          ? `bg-white ${s.borderColor}`
                          : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`size-3 rounded-full ${s.bgColor.replace('100', '500')}`} />
                    </span>
                  )}
                </button>
                {/* Label */}
                <span className={`mt-2 text-xs font-medium ${isExpanded ? s.color : isActive ? s.color : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {isActive && (
                  <span className="text-[10px] text-[#0033A0] font-semibold mt-0.5">You</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded detail card */}
      {expandedStance && (
        <StanceDetailCard
          stance={expandedStance}
          isCurrent={currentStance === expandedStance}
          onSelect={interactive && onSelectStance ? () => onSelectStance(expandedStance) : undefined}
        />
      )}
    </div>
  )
}
