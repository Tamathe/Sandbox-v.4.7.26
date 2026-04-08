'use client'

import { useEffect, useState } from 'react'
import { FileCheck, Shield } from 'lucide-react'
import { courseHeaders, readJson } from './course-utils'
import type { TabId } from './course-types'

// ── Types ────────────────────────────────────────────────────────────────────

interface StoredPolicy {
  id: string
  policyType: string
  title: string
}

interface StoredGradingWeight {
  id: string
  category: string
  weight: number
  description: string | null
}

interface CoursePolicySummaryCardProps {
  courseId: string
  userEmail: string
  onSwitchTab: (tab: TabId) => void
}

// ── Category colors for chips ────────────────────────────────────────────────

const CHIP_COLORS: Record<string, string> = {
  late: 'bg-amber-100 text-amber-700',
  attendance: 'bg-blue-100 text-blue-700',
  grading: 'bg-green-100 text-green-700',
  academic_integrity: 'bg-red-100 text-red-700',
  communication: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
}

// ── Stacked bar colors ───────────────────────────────────────────────────────

const BAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-red-400',
  'bg-teal-500',
  'bg-pink-400',
  'bg-indigo-400',
]

// ── Component ────────────────────────────────────────────────────────────────

export default function CoursePolicySummaryCard({ courseId, userEmail, onSwitchTab }: CoursePolicySummaryCardProps) {
  const [policies, setPolicies] = useState<StoredPolicy[] | null>(null)
  const [weights, setWeights] = useState<StoredGradingWeight[] | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    readJson<{ policies: StoredPolicy[]; gradingWeights: StoredGradingWeight[] }>(
      `/api/courses/${courseId}/apply-policies`,
      { headers: courseHeaders(userEmail) },
    )
      .then((data) => {
        if (cancelled) return
        setPolicies(data.policies)
        setWeights(data.gradingWeights)
      })
      .catch(() => {
        if (cancelled) return
        setPolicies([])
        setWeights([])
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => { cancelled = true }
  }, [courseId, userEmail])

  // Don't render until loaded, and hide if empty
  if (!loaded) return null
  if ((!policies || policies.length === 0) && (!weights || weights.length === 0)) return null

  // Group policy titles by category
  const grouped = new Map<string, string[]>()
  for (const p of policies ?? []) {
    const list = grouped.get(p.policyType) ?? []
    list.push(p.title)
    grouped.set(p.policyType, list)
  }

  return (
    <div className="border-2 rounded-2xl bg-white p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">Course Policies</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <FileCheck className="size-3" />
            From Syllabus
          </span>
          <button
            type="button"
            onClick={() => onSwitchTab('policies')}
            className="text-xs font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
          >
            View All &rarr;
          </button>
        </div>
      </div>

      {/* Policy chips grouped by category */}
      {policies && policies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from(grouped.entries()).map(([category, titles]) =>
            titles.map((title) => (
              <span
                key={`${category}-${title}`}
                className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${CHIP_COLORS[category] ?? CHIP_COLORS.other}`}
              >
                {title}
              </span>
            ))
          )}
        </div>
      )}

      {/* Grading weight stacked bar */}
      {weights && weights.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Grading Breakdown</p>
          <div className="flex h-3 rounded-full overflow-hidden">
            {weights.map((w, i) => {
              const pct = Math.round(w.weight * 100)
              if (pct <= 0) return null
              return (
                <div
                  key={w.id}
                  className={`${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${w.category}: ${pct}%${w.description ? ` — ${w.description}` : ''}`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {weights.map((w, i) => (
              <span key={w.id} className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`inline-block size-2 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                {w.category} {Math.round(w.weight * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
