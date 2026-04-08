'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Compass, FileText, PenTool, PartyPopper, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface GoldenPathState {
  stance: boolean
  policy: boolean
  scan: boolean
}

const STEPS = [
  { key: 'stance' as const, label: 'Stance', icon: Compass, href: '/ai-literacy/stance', color: 'bg-blue-100 text-blue-600' },
  { key: 'policy' as const, label: 'Policy', icon: FileText, href: '/ai-literacy/policy', color: 'bg-amber-100 text-amber-600' },
  { key: 'scan' as const, label: 'Scan', icon: PenTool, href: '/ai-literacy/assignments', color: 'bg-red-100 text-red-600' },
  { key: 'done' as const, label: 'Done', icon: PartyPopper, href: '/ai-literacy', color: 'bg-green-100 text-green-600' },
]

export default function GoldenPathProgress() {
  const { currentUser } = useAuth()
  const isEducatorOrAdmin = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'

  const progress = useMemo<GoldenPathState | null>(() => {
    if (!isEducatorOrAdmin) return null
    try {
      const stored = localStorage.getItem('golden-path-progress')
      if (stored) return JSON.parse(stored)
    } catch {}
    return null
  }, [isEducatorOrAdmin])

  if (!isEducatorOrAdmin || !progress) return null

  const allDone = progress.stance && progress.policy && progress.scan

  // Find current step index (first incomplete, or 3 if all done)
  const currentIndex = allDone
    ? 3
    : progress.stance
      ? progress.policy
        ? 2
        : 1
      : 0

  return (
    <div className="max-w-2xl mx-auto mb-6">
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isCompleted = step.key === 'done' ? allDone : progress[step.key]
          const isCurrent = i === currentIndex

          const dot = (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : isCurrent
                  ? 'bg-[#0033A0]/10 text-[#0033A0]'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              {isCompleted ? (
                <Check className="size-3.5" />
              ) : (
                <step.icon className="size-3.5" />
              )}
              <span>{step.label}</span>
            </div>
          )

          return (
            <div key={step.key} className="flex items-center gap-1">
              {isCompleted ? (
                <Link href={step.href}>{dot}</Link>
              ) : (
                dot
              )}
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 ${i < currentIndex ? 'bg-green-200' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
