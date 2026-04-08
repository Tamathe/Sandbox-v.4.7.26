'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import type { CoachingNudge as CoachingNudgeType } from '../../../lib/crisis-comms/spokesperson-trainer/types'

const TECHNIQUE_COLORS: Record<string, string> = {
  bridge: 'bg-blue-50 border-blue-200 text-blue-800',
  block: 'bg-red-50 border-red-200 text-red-800',
  'empathy-lead': 'bg-amber-50 border-amber-200 text-amber-800',
  'fact-forward': 'bg-green-50 border-green-200 text-green-800',
  pivot: 'bg-purple-50 border-purple-200 text-purple-800',
  'acknowledge-unknown': 'bg-gray-50 border-gray-200 text-gray-800',
}

const TECHNIQUE_LABELS: Record<string, string> = {
  bridge: 'Bridge',
  block: 'Block',
  'empathy-lead': 'Empathy Lead',
  'fact-forward': 'Fact Forward',
  pivot: 'Pivot',
  'acknowledge-unknown': 'Acknowledge Unknown',
}

interface CoachingNudgeProps {
  nudge: CoachingNudgeType | null
  onDismiss: () => void
}

export default function CoachingNudge({ nudge, onDismiss }: CoachingNudgeProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (nudge) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 8000)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [nudge, onDismiss])

  if (!nudge) return null

  const colorClasses = TECHNIQUE_COLORS[nudge.technique] ?? TECHNIQUE_COLORS['acknowledge-unknown']

  return (
    <div
      className={`mx-4 mb-3 border rounded-xl px-4 py-3 transition-all duration-300 ${colorClasses} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Lightbulb className="size-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wide">
              {TECHNIQUE_LABELS[nudge.technique] ?? nudge.label}
            </span>
          </div>
          <p className="text-sm leading-snug">{nudge.suggestion}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
