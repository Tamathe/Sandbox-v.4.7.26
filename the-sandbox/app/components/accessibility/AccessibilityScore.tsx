'use client'

import { Shield } from 'lucide-react'

const GRADE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-200' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  C: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  D: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
  F: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
}

interface AccessibilityScoreProps {
  grade: string
  score: number
  issueCount?: number
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Compact accessibility score badge. Shows grade letter with shield icon.
 * Used on course materials, tool cards, and dashboard summaries.
 */
export default function AccessibilityScore({
  grade,
  score,
  issueCount,
  size = 'sm',
}: AccessibilityScoreProps) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES.C

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}
        title={`Accessibility: ${grade} (${Math.round(score * 100)}%)${issueCount != null ? ` — ${issueCount} issues` : ''}`}
      >
        <Shield className="size-3" />
        {grade}
      </span>
    )
  }

  if (size === 'md') {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1 ${style.bg} ${style.text} ${style.ring}`}
        title={`Accessibility: ${grade} (${Math.round(score * 100)}%)`}
      >
        <Shield className="size-4" />
        <span className="text-sm font-semibold">{grade}</span>
        <span className="text-xs opacity-75">{Math.round(score * 100)}%</span>
        {issueCount != null && issueCount > 0 && (
          <span className="text-xs opacity-75">· {issueCount} issues</span>
        )}
      </div>
    )
  }

  // Large — used in detail views
  return (
    <div className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${style.bg} ${style.ring}`}>
      <div className={`flex size-14 items-center justify-center rounded-full ring-2 ${style.ring} ${style.bg}`}>
        <span className={`text-2xl font-extrabold ${style.text}`}>{grade}</span>
      </div>
      <div>
        <div className={`text-sm font-semibold ${style.text}`}>
          Accessibility Score: {Math.round(score * 100)}%
        </div>
        {issueCount != null && (
          <div className="text-xs text-gray-500">
            {issueCount === 0 ? 'No issues found' : `${issueCount} issue${issueCount !== 1 ? 's' : ''} detected`}
          </div>
        )}
      </div>
    </div>
  )
}
