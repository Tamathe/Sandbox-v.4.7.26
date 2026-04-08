'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, ChevronUp, Info, Shield, ArrowRight } from 'lucide-react'

interface PolicyCourse {
  courseId: string
  courseCode: string
  title: string
  policies: { id: string; title: string; policyType: string }[]
  gradingWeights: { id: string; category: string; weight: number }[]
}

interface PolicyConflict {
  type: 'late' | 'attendance'
  courseCodes: string[]
  description: string
}

interface PolicyComparison {
  conflicts: PolicyConflict[]
  insights: string[]
}

const WEIGHT_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500',
]

export default function CoursePoliciesWidget({ userEmail }: { userEmail: string }) {
  const [courses, setCourses] = useState<PolicyCourse[]>([])
  const [comparison, setComparison] = useState<PolicyComparison | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [insightsExpanded, setInsightsExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/enrollment/policies', {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.courses) setCourses(d.courses)
        if (d?.comparison) setComparison(d.comparison)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [userEmail])

  if (!loaded || courses.length === 0) return null

  const hasInsights = comparison && (comparison.conflicts.length > 0 || comparison.insights.length > 0)
  const totalItems = (comparison?.conflicts.length ?? 0) + (comparison?.insights.length ?? 0)
  const shouldCollapse = totalItems > 3

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="size-4 text-[#0033A0]" />
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Course Policies</h2>
      </div>

      <div className="space-y-3">
        {courses.map(c => (
          <div key={c.courseId} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">{c.courseCode}</span>
              <Link
                href={`/courses?course=${c.courseId}&tab=policies`}
                className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-0.5"
              >
                View Details <ArrowRight className="size-3" />
              </Link>
            </div>

            {/* Policy chips */}
            {c.policies.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {c.policies.slice(0, 3).map(p => (
                  <span key={p.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {p.title}
                  </span>
                ))}
                {c.policies.length > 3 && (
                  <span className="text-xs text-gray-400">+{c.policies.length - 3} more</span>
                )}
              </div>
            )}

            {/* Mini grading bar */}
            {c.gradingWeights.length > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                {c.gradingWeights.map((w, i) => (
                  <div
                    key={w.id}
                    className={`${WEIGHT_COLORS[i % WEIGHT_COLORS.length]} transition-all`}
                    style={{ width: `${Math.round(w.weight * 100)}%` }}
                    title={`${w.category}: ${Math.round(w.weight * 100)}%`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Policy Insights (Task 30) */}
      {hasInsights && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setInsightsExpanded(!insightsExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors mb-2"
          >
            Policy Insights
            {shouldCollapse && (insightsExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
          </button>

          {(!shouldCollapse || insightsExpanded) && (
            <div className="space-y-2">
              {/* Conflicts */}
              {comparison.conflicts.map((conflict, i) => (
                <div key={`conflict-${i}`} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">{conflict.description}</p>
                </div>
              ))}

              {/* Insights */}
              {comparison.insights.map((insight, i) => (
                <div key={`insight-${i}`} className="flex items-start gap-2 px-3 py-1.5">
                  <Info className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600">{insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
