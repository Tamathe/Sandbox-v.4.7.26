'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, BookOpen, Loader2 } from 'lucide-react'

type Misconception = {
  id: string
  conceptSlug: string
  misconceptionText: string
  prevalence: number
  firedCount: number
  remediationHint: string
}

type ApiData = {
  topMisconceptions: Misconception[]
  unseededAlert: boolean
}

type Props = {
  courseId: string | null
  userEmail: string
}

export default function MisconceptionDashboard({ courseId, userEmail }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiData | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    if (!courseId) {
      setData(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/analytics/faculty/misconceptions?courseId=${courseId}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.json())
      .then((d: ApiData) => setData(d))
      .catch(() => setError('Failed to load misconceptions'))
      .finally(() => setLoading(false))
  }, [courseId, userEmail])

  async function handleSeed() {
    if (!courseId) return
    setSeeding(true)
    try {
      await fetch(`/api/courses/${courseId}/seed-misconceptions`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      // Re-fetch after seeding
      const res = await fetch(`/api/analytics/faculty/misconceptions?courseId=${courseId}`, {
        headers: { 'x-demo-user-email': userEmail },
      })
      const d: ApiData = await res.json()
      setData(d)
    } catch {
      // Non-fatal
    } finally {
      setSeeding(false)
    }
  }

  // No course selected
  if (!courseId) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="size-10 text-gray-300" />
        <p className="font-semibold text-gray-500">Select a course to view misconceptions</p>
      </div>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  // Unseeded / empty
  if (!data || data.unseededAlert || data.topMisconceptions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 flex flex-col items-center gap-4 text-center">
        <div className="size-12 bg-amber-50 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="size-6 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">No misconceptions seeded yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Misconceptions are extracted from course materials using AI. Seeding creates a taxonomy
            of common student errors for this course.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0033A0] text-white text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60"
        >
          {seeding ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Seeding…
            </>
          ) : (
            <>
              <BookOpen className="size-4" />
              Seed Misconceptions
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.topMisconceptions.map(m => (
        <div key={m.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 text-xs font-semibold">
              {m.conceptSlug}
            </span>
            <span className="bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 text-xs font-semibold">
              {m.firedCount} fired
            </span>
          </div>

          {/* Misconception text */}
          <p className="text-sm text-gray-700 font-medium mb-2">{m.misconceptionText}</p>

          {/* Prevalence bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Prevalence</span>
              <span className="font-medium">{Math.round(m.prevalence * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-orange-400 h-1.5 rounded-full"
                style={{ width: `${m.prevalence * 100}%` }}
              />
            </div>
          </div>

          {/* Remediation hint collapsible */}
          <button
            onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {expandedId === m.id ? (
              <>Show less <ChevronUp className="size-3" /></>
            ) : (
              <>Show remediation hint <ChevronDown className="size-3" /></>
            )}
          </button>

          {expandedId === m.id && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
              {m.remediationHint}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
