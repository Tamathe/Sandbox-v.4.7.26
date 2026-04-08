'use client'

import { useCallback, useEffect, useState } from 'react'
import { Columns3, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { CrossSectionInsight } from '../../lib/classroom-intelligence/types'

interface CrossSectionTableProps {
  courseCode: string
}

function spreadColor(spread: number): string {
  if (spread < 0.10) return 'text-green-700 bg-green-50'
  if (spread <= 0.15) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

export default function CrossSectionTable({ courseCode }: CrossSectionTableProps) {
  const { currentUser } = useAuth()
  const [insights, setInsights] = useState<CrossSectionInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<CrossSectionInsight[]>(
        currentUser.email,
        `/api/classroom-intelligence/cross-section/${courseCode}`,
      )
      setInsights(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cross-section data')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseCode])

  useEffect(() => { fetch_() }, [fetch_])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-5 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 text-center py-6">{error}</p>
  }

  if (insights.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No cross-section data available.</p>
  }

  // Collect all unique section labels
  const sectionLabels = Array.from(
    new Set(insights.flatMap((ins) => ins.sections.map((s) => s.label))),
  ).sort()

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <Columns3 className="size-4 text-[#0033A0]" />
        <h2 className="font-extrabold text-lg text-gray-900">Cross-Section Comparison</h2>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 pr-3 font-extrabold text-gray-700">Concept</th>
            {sectionLabels.map((label) => (
              <th key={label} className="py-2 px-3 font-extrabold text-gray-700 text-center">
                {label}
              </th>
            ))}
            <th className="py-2 px-3 font-extrabold text-gray-700 text-center">Spread</th>
            <th className="py-2 px-3 font-extrabold text-gray-700 text-center">Significant?</th>
            <th className="py-2 px-3 font-extrabold text-gray-700">Best Approach</th>
          </tr>
        </thead>
        <tbody>
          {insights.map((ins) => (
            <tr key={ins.concept} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2.5 pr-3 font-semibold text-gray-900">{ins.concept}</td>
              {sectionLabels.map((label) => {
                const sec = ins.sections.find((s) => s.label === label)
                return (
                  <td key={label} className="py-2.5 px-3 text-center tabular-nums">
                    {sec ? `${Math.round(sec.masteryRate * 100)}%` : '—'}
                  </td>
                )
              })}
              <td className="py-2.5 px-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${spreadColor(ins.spread)}`}>
                  {Math.round(ins.spread * 100)}%
                </span>
              </td>
              <td className="py-2.5 px-3 text-center">
                {ins.isSignificant ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                    <AlertTriangle className="size-3" /> Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="size-3" /> No
                  </span>
                )}
              </td>
              <td className="py-2.5 px-3 text-xs text-gray-600">
                {ins.bestApproach ? ins.bestApproach.replace(/_/g, ' ') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
