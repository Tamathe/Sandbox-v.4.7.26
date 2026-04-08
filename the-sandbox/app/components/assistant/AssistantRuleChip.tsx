'use client'

import React, { useState } from 'react'
import { Shield, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props {
  ruleId: string
  naturalText: string
  isActive: boolean
  onToggle?: (ruleId: string, isActive: boolean) => void
}

export default function AssistantRuleChip({ ruleId, naturalText, isActive: initialActive, onToggle }: Props) {
  const [active, setActive] = useState(initialActive)

  const handleToggle = () => {
    const newState = !active
    setActive(newState)
    onToggle?.(ruleId, newState)
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 my-1 transition-all ${
      active
        ? 'border-[#0033A0]/30 bg-blue-50'
        : 'border-gray-200 bg-gray-50 opacity-60'
    }`}>
      <Shield className={`size-3 ${active ? 'text-[#0033A0]' : 'text-gray-400'}`} />
      <span className={`text-xs font-medium ${active ? 'text-gray-700' : 'text-gray-400'}`}>
        {naturalText}
      </span>
      <button onClick={handleToggle} className="ml-1 shrink-0">
        {active ? (
          <ToggleRight className="size-4 text-[#0033A0]" />
        ) : (
          <ToggleLeft className="size-4 text-gray-400" />
        )}
      </button>
    </div>
  )
}
