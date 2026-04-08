'use client'

import { useEffect, useState } from 'react'
import { Check, Circle } from 'lucide-react'

interface SyllabusStatus {
  hasParseJob: boolean
  hasCourseMap: boolean
  assignmentCount: number
  objectiveCount: number
  unitCount: number | null
}

interface SetupChecklistProps {
  courseId: string
  userEmail: string
  materialsCount: number
  linkedToolsCount: number
  onSwitchTab: (tab: string) => void
}

export default function SetupChecklist({
  courseId,
  userEmail,
  materialsCount,
  linkedToolsCount,
  onSwitchTab,
}: SetupChecklistProps) {
  const [status, setStatus] = useState<SyllabusStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/syllabus-status`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: SyllabusStatus) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [courseId, userEmail])

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading setup status...</p>
  }

  const steps = [
    {
      label: 'Upload syllabus',
      done: status?.hasParseJob ?? false,
      action: () => onSwitchTab('content'),
    },
    {
      label: 'Add course materials',
      done: materialsCount >= 1,
      action: () => onSwitchTab('content'),
    },
    {
      label: 'Generate course map',
      done: status?.hasCourseMap ?? false,
      action: () => onSwitchTab('analytics'),
    },
    {
      label: 'Link course tools',
      done: linkedToolsCount >= 1,
      action: () => onSwitchTab('content'),
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  const pct = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0033A0] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">{completedCount}/{steps.length}</span>
      </div>

      {allDone ? (
        <p className="text-sm text-green-600 font-medium">Course setup complete!</p>
      ) : (
        <ul className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {step.done ? (
                <Check className="size-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="size-4 text-gray-300 shrink-0" />
              )}
              {step.done ? (
                <span className="text-gray-400 line-through">{step.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={step.action}
                  className="text-[#0033A0] font-medium hover:underline"
                >
                  {step.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
