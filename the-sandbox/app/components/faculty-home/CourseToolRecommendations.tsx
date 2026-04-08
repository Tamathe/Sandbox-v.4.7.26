'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  GitFork,
  Loader2,
  Sparkles,
  Star,
  Users,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface RecommendedTool {
  toolId: string
  name: string
  shortDescription: string | null
  category: string
  rating: number
  useCount: number
  matchReason: string
  departmentAdoption: number
  forkedFromId: string | null
}

interface CourseRecommendation {
  courseId: string
  courseCode: string
  courseTitle: string
  currentModule: string | null
  moduleObjectives: string[]
  recommendedTools: RecommendedTool[]
}

export default function CourseToolRecommendations() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [forkingId, setForkingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch('/api/faculty/course-tool-recommendations', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!cancelled) setRecommendations(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setRecommendations([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [currentUser.email])

  async function handleFork(toolId: string) {
    if (forkingId) return
    setForkingId(toolId)
    try {
      const response = await fetch(`/api/tools/${toolId}/fork`, {
        method: 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!response.ok) return
      const data = await response.json() as { sessionId?: string }
      if (data.sessionId) {
        router.push(`/builder?sessionId=${encodeURIComponent(data.sessionId)}`)
      }
    } finally {
      setForkingId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) return null

  // Only show courses that have recommendations or could benefit from "build one" CTA
  const coursesWithContent = recommendations.filter(
    r => r.recommendedTools.length > 0 || r.currentModule
  )

  if (coursesWithContent.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Suggested Tools for Your Courses</h3>
      </div>

      <div className="space-y-5">
        {coursesWithContent.map(course => (
          <div key={course.courseId}>
            {/* Course header */}
            <div className="mb-2.5">
              <span className="text-xs font-bold text-[#0033A0]">{course.courseCode}</span>
              {course.currentModule && (
                <span className="ml-1.5 text-xs text-gray-500">— {course.currentModule}</span>
              )}
            </div>

            {course.recommendedTools.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {course.recommendedTools.map(tool => (
                  <div
                    key={tool.toolId}
                    className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-3.5 transition-all hover:border-[#0033A0]/40 hover:shadow-sm"
                  >
                    {/* Tool name + description */}
                    <Link
                      href={`/tools/${tool.toolId}`}
                      className="flex-1"
                    >
                      <h4 className="text-sm font-bold text-gray-900 leading-tight group-hover:text-[#0033A0] transition-colors">
                        {tool.name}
                      </h4>
                      {tool.shortDescription && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {tool.shortDescription}
                        </p>
                      )}
                    </Link>

                    {/* Rating + use count */}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                      {tool.rating > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {tool.rating}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        <Users className="size-3" />
                        {tool.useCount}×
                      </span>
                    </div>

                    {/* Match reason */}
                    <p className="mt-1.5 text-[10px] font-medium text-[#0033A0]/60">
                      {tool.matchReason}
                    </p>

                    {/* Action buttons */}
                    <div className="mt-2.5 flex gap-2">
                      <Link
                        href={`/tools/${tool.toolId}`}
                        className="flex-1 rounded-lg bg-[#0033A0] px-3 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-[#002480]"
                      >
                        Use
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleFork(tool.toolId)}
                        disabled={forkingId === tool.toolId}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#0033A0] hover:text-[#0033A0] disabled:opacity-50"
                      >
                        {forkingId === tool.toolId ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <GitFork className="size-3" />
                        )}
                        Fork
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state — no matching tools */
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  No matching tools for {course.currentModule ?? 'this module'}.
                </p>
                <Link
                  href={`/build?courseId=${course.courseId}&module=${encodeURIComponent(course.currentModule ?? '')}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                >
                  <Wrench className="size-3" />
                  Build one
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
