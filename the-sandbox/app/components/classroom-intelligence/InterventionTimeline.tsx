'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { Approach } from '../../lib/classroom-intelligence/types'
import LoadingSpinner from '../LoadingSpinner'
import ErrorBanner from '../ErrorBanner'

interface Intervention {
  id: string
  approach: Approach
  description: string
  targetConcepts: string[]
  createdAt: string
  status: 'active' | 'effective' | 'ineffective' | 'inconclusive'
  preMetrics?: { masteryRate: number; successRate: number }
  postMetrics?: { masteryRate: number; successRate: number }
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  effective: 'bg-green-100 text-green-700',
  ineffective: 'bg-red-100 text-red-700',
  inconclusive: 'bg-gray-100 text-gray-600',
}

interface InterventionTimelineProps {
  courseId: string
}

export default function InterventionTimeline({ courseId }: InterventionTimelineProps) {
  const { currentUser } = useAuth()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Intervention[]>(
        currentUser.email,
        `/api/classroom-intelligence/interventions?courseId=${courseId}`,
      )
      setInterventions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interventions')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseId])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" label="Loading interventions…" />
      </div>
    )
  }

  if (error) {
    return <ErrorBanner message={error} retry={fetch_} />
  }

  if (interventions.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No interventions recorded yet for this course.
      </p>
    )
  }

  return (
    <div className="max-w-6xl">
      <h2 className="font-extrabold text-lg text-gray-900 mb-6">Intervention Timeline</h2>
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {interventions.map((iv) => (
            <div key={iv.id} className="relative">
              {/* Dot */}
              <div className="absolute -left-5 top-4 size-3 rounded-full border-2 border-[#0033A0] bg-white" />

              <div className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase bg-[#0033A0]/10 text-[#0033A0] px-2 py-0.5 rounded-full">
                    {iv.approach.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[iv.status]}`}>
                    {iv.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                    <Calendar className="size-3" />
                    {new Date(iv.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700">{iv.description}</p>

                {/* Target Concepts */}
                {iv.targetConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {iv.targetConcepts.map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Pre/Post Comparison */}
                {iv.postMetrics && iv.preMetrics && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Pre-Mastery</p>
                      <p className="font-extrabold text-lg text-gray-900">
                        {Math.round(iv.preMetrics.masteryRate * 100)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Post-Mastery</p>
                      <p className={`font-extrabold text-lg ${
                        iv.postMetrics.masteryRate > iv.preMetrics.masteryRate
                          ? 'text-green-600'
                          : iv.postMetrics.masteryRate < iv.preMetrics.masteryRate
                            ? 'text-red-600'
                            : 'text-gray-900'
                      }`}>
                        {Math.round(iv.postMetrics.masteryRate * 100)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
