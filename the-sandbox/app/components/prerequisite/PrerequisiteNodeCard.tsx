'use client'

import { AlertTriangle, Clock } from 'lucide-react'

interface PrerequisiteNodeData {
  concept: string
  effectiveMastery: number
  isStale: boolean
  isGap: boolean
  depth: number
  courseId?: string
  courseCode?: string
}

interface PrerequisiteNodeCardProps {
  node: PrerequisiteNodeData
  isRootGap: boolean
  isTarget?: boolean
}

function formatConcept(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function masteryColor(mastery: number): string {
  if (mastery >= 0.75) return '#22c55e'
  if (mastery >= 0.4) return '#f59e0b'
  return '#ef4444'
}

export default function PrerequisiteNodeCard({
  node,
  isRootGap,
  isTarget,
}: PrerequisiteNodeCardProps) {
  const pct = Math.round(node.effectiveMastery * 100)

  let borderBg = 'border-green-300 bg-green-50'
  if (isTarget) {
    borderBg = 'border-[#0033A0] bg-blue-50'
  } else if (isRootGap) {
    borderBg = 'border-red-400 bg-red-50'
  } else if (node.isGap) {
    borderBg = 'border-amber-300 bg-amber-50'
  } else if (node.isStale) {
    borderBg = 'border-yellow-300 bg-yellow-50'
  }

  return (
    <div className={`rounded-xl border-2 p-3 ${borderBg}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm text-gray-900 truncate">
          {formatConcept(node.concept)}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isRootGap && (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              <AlertTriangle className="size-3" />
              Root Gap
            </span>
          )}
          {!isRootGap && node.isStale && (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
              <Clock className="size-3" />
              Stale
            </span>
          )}
          {isTarget && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-[#0033A0] text-xs font-bold px-2 py-0.5 rounded-full">
              Your Concept
            </span>
          )}
          <span className="text-xs font-bold text-gray-600">{pct}%</span>
        </div>
      </div>
      {/* Mastery bar */}
      <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: masteryColor(node.effectiveMastery),
          }}
        />
      </div>
    </div>
  )
}
