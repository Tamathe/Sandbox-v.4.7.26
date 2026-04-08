'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, RefreshCw, TrendingUp, TrendingDown, Minus,
  Clock, Wrench, BookOpen, Brain, Lightbulb, AlertCircle,
} from 'lucide-react'
import type { LearningRecap } from '../lib/learning-recap-service'

interface LearningRecapCardProps {
  userEmail: string
}

export default function LearningRecapCard({ userEmail }: LearningRecapCardProps) {
  const [recap, setRecap] = useState<LearningRecap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecap = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/learning-recap', {
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!res.ok) throw new Error('Failed to load recap')
      const data: LearningRecap = await res.json()
      setRecap(data)
    } catch {
      setError('Could not load your weekly recap. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  useEffect(() => { fetchRecap() }, [fetchRecap])

  // Format week range
  function formatWeekRange(start: string, end: string) {
    const s = new Date(start)
    const e = new Date(end)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const startStr = s.toLocaleDateString('en-US', opts)
    const endStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
    return `${startStr} – ${endStr}`
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden animate-pulse">
        <div className="h-1 bg-[#0033A0]" />
        <div className="p-5">
          <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <div className="h-1 bg-[#0033A0]" />
        <div className="p-5 text-center">
          <AlertCircle className="size-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <button
            onClick={fetchRecap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0033A0] text-white text-xs font-semibold hover:bg-[#002580] transition-colors"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (!recap) return null

  const { stats, masteryChanges, spacedRepetitionStatus, aiInsights } = recap
  const srTotal = spacedRepetitionStatus.totalConcepts
  const srOnTrackPct = srTotal > 0 ? (spacedRepetitionStatus.onTrack / srTotal) * 100 : 100

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-md transition-all">
      <div className="h-1 bg-[#0033A0]" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-[#0033A0]" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Weekly Learning Recap</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatWeekRange(recap.weekStart, recap.weekEnd)}</span>
            <button
              onClick={fetchRecap}
              aria-label="Refresh recap"
              className="p-1 rounded-md text-gray-400 hover:text-[#0033A0] hover:bg-blue-50 transition-colors"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Brain className="size-4 text-[#0033A0] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-gray-900">{stats.totalSessions}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Sessions</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Clock className="size-4 text-[#0033A0] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-gray-900">{stats.totalMinutes}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Minutes</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Wrench className="size-4 text-[#0033A0] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-gray-900">{stats.toolsUsed.length}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Tools</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <BookOpen className="size-4 text-[#0033A0] mx-auto mb-1" />
            <p className="text-lg font-extrabold text-gray-900">{stats.coursesStudied.length}</p>
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Courses</p>
          </div>
        </div>

        {/* AI Summary */}
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{recap.summary}</p>

        {/* Mastery Changes */}
        {masteryChanges.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-[#0033A0]" /> Mastery Changes
            </h3>
            <div className="space-y-1.5">
              {masteryChanges.map((mc) => (
                <div key={mc.concept} className="flex items-center gap-2 text-sm">
                  {mc.direction === 'improved' && <TrendingUp className="size-3.5 text-green-600 flex-shrink-0" />}
                  {mc.direction === 'declined' && <TrendingDown className="size-3.5 text-red-500 flex-shrink-0" />}
                  {mc.direction === 'stable' && <Minus className="size-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-gray-700">{mc.concept}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {Math.round(mc.previousMastery * 100)}% → {Math.round(mc.currentMastery * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spaced Repetition Status */}
        {srTotal > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Spaced Repetition</h3>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${srOnTrackPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-semibold text-gray-500">
              <span className="text-green-600">{spacedRepetitionStatus.onTrack} on track</span>
              {spacedRepetitionStatus.overdue > 0 && (
                <span className="text-amber-600">{spacedRepetitionStatus.overdue} overdue</span>
              )}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {aiInsights.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Lightbulb className="size-3.5 text-amber-500" /> AI Insights
            </h3>
            <ul className="space-y-1.5">
              {aiInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-[#0033A0] font-bold mt-0.5">·</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
