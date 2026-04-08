'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { ConceptDifficulty, DifficultyLevel } from '../../lib/classroom-intelligence/types'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

const DIFFICULTY_STYLES: Record<DifficultyLevel, { bg: string; text: string }> = {
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
  VERY_DIFFICULT: { bg: 'bg-orange-100', text: 'text-orange-700' },
  DIFFICULT: { bg: 'bg-amber-100', text: 'text-amber-700' },
  MODERATE: { bg: 'bg-blue-100', text: 'text-blue-700' },
  EASY: { bg: 'bg-green-100', text: 'text-green-700' },
}

interface ConceptHeatmapProps {
  courseId: string
  onSelect: (concept: ConceptDifficulty) => void
}

export default function ConceptHeatmap({ courseId, onSelect }: ConceptHeatmapProps) {
  const { currentUser } = useAuth()
  const [concepts, setConcepts] = useState<ConceptDifficulty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConcepts = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<ConceptDifficulty[]>(
        currentUser.email,
        `/api/classroom-intelligence/concepts/${courseId}`,
      )
      setConcepts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load concepts')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseId])

  useEffect(() => {
    fetchConcepts()
  }, [fetchConcepts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading concept heatmap…" />
      </div>
    )
  }

  if (error) {
    return <ErrorBanner message={error} retry={fetchConcepts} />
  }

  if (concepts.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No concept data available yet for this course.
      </p>
    )
  }

  return (
    <div className="max-w-6xl">
      <h2 className="font-extrabold text-lg text-gray-900 mb-4">Concept Heatmap</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {concepts.map((c) => {
          const style = DIFFICULTY_STYLES[c.difficulty]
          return (
            <button
              key={c.concept}
              onClick={() => onSelect(c)}
              className={`${style.bg} ${style.text} rounded-2xl p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40`}
            >
              <p className="font-extrabold text-sm truncate">{c.conceptLabel}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-semibold">
                  {Math.round(c.masteryRate * 100)}%
                </span>
                <span className="flex items-center gap-0.5 text-xs">
                  {c.delta7d > 0 ? (
                    <ArrowUp className="size-3" />
                  ) : c.delta7d < 0 ? (
                    <ArrowDown className="size-3" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                  {Math.abs(Math.round(c.delta7d * 100))}%
                </span>
              </div>
              <span
                className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} border border-current/20`}
              >
                {c.difficulty.replace('_', ' ')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
