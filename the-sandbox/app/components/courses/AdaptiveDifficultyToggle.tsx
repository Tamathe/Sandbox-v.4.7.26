'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type OverrideValue = 'adaptive' | 'strict' | 'off'

const OPTIONS: { value: OverrideValue; label: string; tooltip: string }[] = [
  {
    value: 'adaptive',
    label: 'Adaptive',
    tooltip: "Sandy adjusts scaffold depth automatically based on this student's Bloom level and cognitive load.",
  },
  {
    value: 'strict',
    label: 'Strict',
    tooltip: 'Always scaffold strictly — Sandy breaks every concept into small steps regardless of student level.',
  },
  {
    value: 'off',
    label: 'Off',
    tooltip: 'Disable the pedagogical guardrail for this tool. Sandy may answer directly without scaffolding.',
  },
]

interface Props {
  courseId: string
  toolId: string
  userEmail: string
  currentOverride: string | null
}

export default function AdaptiveDifficultyToggle({
  courseId,
  toolId,
  userEmail,
  currentOverride,
}: Props) {
  const [selected, setSelected] = useState<OverrideValue>(
    (currentOverride as OverrideValue) ?? 'adaptive',
  )
  const [saving, setSaving] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)

  async function handleSelect(value: OverrideValue) {
    if (value === selected || saving) return
    setSaving(true)
    const prev = selected
    setSelected(value)
    try {
      const res = await fetch(`/api/courses/${courseId}/tools/${toolId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ adaptiveDifficultyOverride: value }),
      })
      if (!res.ok) setSelected(prev)
    } catch {
      setSelected(prev)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex-shrink-0">
        Scaffold
      </span>
      <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => handleSelect(opt.value)}
            onMouseEnter={() => setTooltip(opt.tooltip)}
            onMouseLeave={() => setTooltip(null)}
            className={`relative px-3 py-1 text-xs font-semibold transition-colors ${
              selected === opt.value
                ? 'bg-[#0033A0] text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {saving && <Loader2 className="size-3 animate-spin text-gray-400 mx-1 flex-shrink-0" />}
      </div>
      {tooltip && (
        <span className="text-[10px] text-gray-400 max-w-[180px] leading-tight">{tooltip}</span>
      )}
    </div>
  )
}
