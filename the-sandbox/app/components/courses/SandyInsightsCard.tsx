'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { apiFetch } from '../../lib/api-client'
import type { CourseInsight } from '../../lib/course-insights-service'
import type { TabId } from './course-types'

interface SandyInsightsCardProps {
  courseId: string
  userEmail: string
  onTabChange: (tab: TabId) => void
}

const DEEP_CACHE_PREFIX = 'sandy-deep-insight:'
const DEEP_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export default function SandyInsightsCard({ courseId, userEmail, onTabChange }: SandyInsightsCardProps) {
  const [insights, setInsights] = useState<CourseInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    apiFetch<{ insights: CourseInsight[] }>(userEmail, `/api/courses/${courseId}/insights`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setInsights(data.insights)
      })
      .catch(() => {
        if (!controller.signal.aborted) setInsights([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [courseId, userEmail])

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`${DEEP_CACHE_PREFIX}${courseId}`)
      if (cached) {
        const parsed = JSON.parse(cached) as { analysis: string; cachedAt: number }
        if (Date.now() - parsed.cachedAt < DEEP_CACHE_TTL) {
          setDeepAnalysis(parsed.analysis)
        } else {
          localStorage.removeItem(`${DEEP_CACHE_PREFIX}${courseId}`)
        }
      }
    } catch { /* ignore */ }
  }, [courseId])

  const requestDeepAnalysis = useCallback(async () => {
    setDeepLoading(true)
    setDeepError(null)
    try {
      const data = await apiFetch<{ analysis: string; generatedAt: string }>(
        userEmail,
        `/api/courses/${courseId}/insights/deep`,
        { method: 'POST' }
      )
      setDeepAnalysis(data.analysis)
      localStorage.setItem(`${DEEP_CACHE_PREFIX}${courseId}`, JSON.stringify({
        analysis: data.analysis,
        cachedAt: Date.now(),
      }))
    } catch {
      setDeepError("Sandy couldn't analyze right now. Try again in a few minutes.")
    } finally {
      setDeepLoading(false)
    }
  }, [courseId, userEmail])

  if (loading) return null
  if (insights.length === 0 && !deepAnalysis) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-blue-100">
          <Sparkles className="size-4 text-[#0033A0]" />
        </div>
        <span className="text-sm font-extrabold text-gray-900">Sandy&apos;s Insights</span>
      </div>

      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight) => (
            <button
              key={insight.type}
              type="button"
              onClick={() => insight.actionTab && onTabChange(insight.actionTab)}
              className="block w-full text-left text-sm text-gray-600 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
            >
              {insight.message}
            </button>
          ))}
        </div>
      )}

      {deepAnalysis && (
        <div className="mt-3 rounded-xl bg-blue-50 p-4 text-sm text-gray-700 whitespace-pre-line">
          {deepAnalysis}
        </div>
      )}

      {deepError && (
        <p className="mt-3 text-sm text-red-500">{deepError}</p>
      )}

      <div className="mt-3">
        {deepLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Sandy is thinking...
          </div>
        ) : (
          <button
            type="button"
            onClick={requestDeepAnalysis}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0033A0] transition-colors hover:text-[#002580]"
          >
            <Sparkles className="size-3.5" />
            {deepAnalysis ? 'Refresh analysis' : 'Ask Sandy for deeper analysis'}
          </button>
        )}
      </div>
    </div>
  )
}
