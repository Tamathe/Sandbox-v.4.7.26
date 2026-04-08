'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Stethoscope, ClipboardList, BarChart3, ChevronRight, HelpCircle, X } from 'lucide-react'

const STEPS = [
  { icon: MessageSquare, label: 'Interview', color: 'bg-blue-100 text-blue-600' },
  { icon: Stethoscope, label: 'Examine', color: 'bg-emerald-100 text-emerald-600' },
  { icon: ClipboardList, label: 'Diagnose', color: 'bg-amber-100 text-amber-600' },
  { icon: BarChart3, label: 'Feedback', color: 'bg-violet-100 text-violet-600' },
] as const

const DURATION_ESTIMATES: Record<string, string> = {
  BEGINNER: '~15 minutes',
  INTERMEDIATE: '~25 minutes',
  ADVANCED: '~35 minutes',
  EXPERT: '~45 minutes',
}

const LS_KEY = 'vc-how-it-works-collapsed'

export default function HowItWorksBanner({ completedEncounterCount }: { completedEncounterCount: number }) {
  const isFirstTime = completedEncounterCount === 0
  const [expanded, setExpanded] = useState(isFirstTime)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isFirstTime) {
      const stored = localStorage.getItem(LS_KEY)
      setExpanded(stored === 'open')
    }
  }, [isFirstTime])

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (!isFirstTime) {
      localStorage.setItem(LS_KEY, next ? 'open' : 'collapsed')
    }
  }

  // First-timers always see it; returning users see the help button
  if (!isFirstTime && !mounted) return null

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 text-sm text-[#0033A0] font-medium hover:underline"
        aria-label="Show how Virtual Clinic works"
      >
        <HelpCircle className="size-4" />
        How it works
      </button>
    )
  }

  return (
    <div className="border rounded-2xl shadow-sm p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-gray-900">How Virtual Clinic Works</h3>
        {!isFirstTime && (
          <button type="button" onClick={toggle} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Step flow */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`size-10 rounded-full flex items-center justify-center ${step.color}`}>
                  <Icon className="size-5" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="size-4 text-gray-300 hidden sm:block" />
              )}
            </div>
          )
        })}
      </div>

      {/* Duration estimates */}
      <p className="text-xs text-gray-500 text-center mt-4">
        Estimated time: {Object.values(DURATION_ESTIMATES).join(', ').replace(/,([^,]*)$/, ', or$1')} depending on case difficulty
      </p>
    </div>
  )
}
