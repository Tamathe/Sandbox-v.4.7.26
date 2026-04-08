'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, BookOpen, Lightbulb, Wrench } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import type { WeeklyPulseData } from '../../lib/classroom-intelligence/types'
import ConceptHeatmap from './ConceptHeatmap'

interface WeeklyPulseViewProps {
  courseId: string
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number | null; icon: React.ElementType }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <Icon className="size-4 text-[#0033A0]" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-extrabold text-lg text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function WeeklyPulseView({ courseId }: WeeklyPulseViewProps) {
  const { currentUser } = useAuth()
  const [pulse, setPulse] = useState<WeeklyPulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPulse = useCallback(async () => {
    if (!currentUser?.email) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<WeeklyPulseData>(
        currentUser.email,
        `/api/classroom-intelligence/pulse/${courseId}`,
      )
      setPulse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pulse')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email, courseId])

  useEffect(() => { fetchPulse() }, [fetchPulse])

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

  if (!pulse) {
    return <p className="text-sm text-gray-400 text-center py-6">No pulse data available.</p>
  }

  return (
    <div className="space-y-5">
      {/* Narrative summary */}
      <div className="bg-white border rounded-2xl shadow-sm p-5">
        <h2 className="font-extrabold text-lg text-gray-900 mb-2">
          Week {pulse.weekNumber} Pulse
        </h2>
        <p className="text-sm text-gray-600 italic leading-relaxed">{pulse.narrative}</p>
      </div>

      {/* 4-stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg Score"
          value={pulse.avgScore !== null ? `${Math.round(pulse.avgScore)}%` : null}
          icon={BookOpen}
        />
        <StatCard
          label="Submission Rate"
          value={pulse.submissionRate !== null ? `${Math.round(pulse.submissionRate * 100)}%` : null}
          icon={Activity}
        />
        <StatCard
          label="Insights"
          value={pulse.insightCount}
          icon={Lightbulb}
        />
        <StatCard
          label="Interventions"
          value={pulse.interventionCount}
          icon={Wrench}
        />
      </div>

      {/* Concept heatmap */}
      {pulse.conceptHeatmap.length > 0 && (
        <ConceptHeatmap courseId={courseId} onSelect={() => {}} />
      )}

      {/* Top struggle / improvement */}
      {(pulse.topStruggle || pulse.topImprovement) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pulse.topStruggle && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-red-600 mb-1">Top Struggle</p>
              <p className="text-sm font-extrabold text-red-800">{pulse.topStruggle}</p>
            </div>
          )}
          {pulse.topImprovement && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-green-600 mb-1">Most Improved</p>
              <p className="text-sm font-extrabold text-green-800">{pulse.topImprovement}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
