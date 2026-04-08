'use client'

import { useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Brain,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import type { StudyPlan, StudyPlanItem } from '../lib/study-plan-service'

const PRIORITY_STYLES: Record<StudyPlanItem['priority'], { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
  low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' },
}

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

export default function StudyPlanPanel({
  courseId,
  userEmail,
  onClose,
}: {
  courseId: string
  userEmail: string
  onClose?: () => void
}) {
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({ courseId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to generate study plan')
      }
      const data: StudyPlan = await res.json()
      setPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-[#0033A0]" />
            <span className="font-semibold text-gray-900">Your Study Plan</span>
            {plan && (
              <span className="ml-2 flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#0033A0]">
                <Clock className="size-3" />
                {plan.totalEstimatedMinutes} min
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Initial state — not yet generated */}
          {!plan && !loading && !error && (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-3 size-10 text-gray-200" />
              <h3 className="mb-1 text-sm font-bold text-gray-600">AI-Powered Study Plan</h3>
              <p className="mb-5 text-xs text-gray-400">
                Generate a personalized study plan based on your learning progress and course objectives.
              </p>
              <button
                type="button"
                onClick={generate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002580] transition-colors"
              >
                <Sparkles className="size-4" />
                Generate Study Plan
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 size-8 animate-spin text-[#0033A0]" />
              <p className="text-sm font-medium text-gray-600">Analyzing your learning data...</p>
              <p className="mt-1 text-xs text-gray-400">This may take a few seconds</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="size-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={generate}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002580] transition-colors"
                >
                  <RefreshCw className="size-4" />
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Plan items */}
          {plan && !loading && (
            <div className="space-y-3">
              {plan.items.map((item, idx) => {
                const style = PRIORITY_STYLES[item.priority]
                return (
                  <div key={idx} className="rounded-2xl border-2 border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Brain className="size-4 text-[#0033A0] shrink-0" />
                        <span className="text-sm font-bold text-gray-900">{item.concept}</span>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-gray-500">{item.reason}</p>

                    {item.bloomTarget != null && (
                      <p className="mt-1 text-xs text-gray-400">
                        Bloom target: {BLOOM_LABELS[item.bloomTarget] || `Level ${item.bloomTarget}`}
                      </p>
                    )}

                    {item.recommendedActivities.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {item.recommendedActivities.map((act, actIdx) => (
                          <div
                            key={actIdx}
                            className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700">{act.toolName}</span>
                              <span className="text-xs text-gray-400">{act.activityType}</span>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="size-3" />
                              {act.estimatedMinutes}m
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer — regenerate */}
        {plan && !loading && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="size-4" />
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
