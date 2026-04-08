'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import ErrorBanner from '../ErrorBanner'
import { PolicyStanceBadge } from './StanceResult'
import type { AIStance } from '../../generated/prisma'

interface AssignmentRisk {
  id: string
  title: string
  category: string | null
  aiRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskReason: string
}

interface CourseImpact {
  courseId: string
  courseCode: string
  title: string
  hasAIPolicy: boolean
  assignments: AssignmentRisk[]
  flaggedCount: number
  totalAssignments: number
}

const RISK_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  LOW: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  HIGH: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-600' },
}

export default function CourseImpactPreview() {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState<CourseImpact[]>([])
  const [stance, setStance] = useState<AIStance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/stance/course-impact', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Failed to load')
          return
        }
        const data = await res.json()
        setCourses(data.courses)
        setStance(data.stance)
      } catch {
        setError('Failed to load course impact data')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Analyzing your courses...</span>
      </div>
    )
  }

  if (error) {
    return <ErrorBanner message={error} />
  }

  if (courses.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <p className="text-sm text-gray-600">No courses found. Course impact analysis is available when you have active courses.</p>
      </div>
    )
  }

  const totalFlagged = courses.reduce((sum, c) => sum + c.flaggedCount, 0)
  const coursesWithoutPolicy = courses.filter(c => !c.hasAIPolicy).length

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="flex items-center gap-4 flex-wrap">
        {stance && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Your stance:</span>
            <PolicyStanceBadge stance={stance} />
          </div>
        )}
        {coursesWithoutPolicy > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-amber-700">
            <AlertCircle className="size-4" />
            {coursesWithoutPolicy} course{coursesWithoutPolicy > 1 ? 's' : ''} without AI policy
          </div>
        )}
        {totalFlagged > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-700">
            <FileText className="size-4" />
            {totalFlagged} high-risk assignment{totalFlagged > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Course cards */}
      <div className="space-y-3">
        {courses.map(course => {
          const isExpanded = expandedCourse === course.courseId
          return (
            <div key={course.courseId} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
              <button
                onClick={() => setExpandedCourse(isExpanded ? null : course.courseId)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{course.courseCode}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-sm text-gray-600 truncate">{course.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {course.hasAIPolicy ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="size-3" /> Policy exists
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle className="size-3" /> Needs AI policy
                        </span>
                      )}
                      {course.flaggedCount > 0 && (
                        <span className="text-xs text-red-600">
                          {course.flaggedCount} of {course.totalAssignments} assignments flagged
                        </span>
                      )}
                      {course.flaggedCount === 0 && course.totalAssignments > 0 && (
                        <span className="text-xs text-green-600">
                          All {course.totalAssignments} assignments OK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="size-4 text-gray-400 shrink-0" /> : <ChevronDown className="size-4 text-gray-400 shrink-0" />}
              </button>

              {isExpanded && course.assignments.length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 space-y-2">
                    {course.assignments.map(a => {
                      const rc = RISK_COLORS[a.aiRisk]
                      return (
                        <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg ${rc.bg}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`size-2 rounded-full shrink-0 ${rc.dot}`} />
                            <span className="text-sm text-gray-900 truncate">{a.title}</span>
                            {a.category && (
                              <span className="text-xs text-gray-500 shrink-0">({a.category})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-medium ${rc.text}`}>{a.aiRisk}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {isExpanded && course.assignments.length === 0 && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="mt-3 text-sm text-gray-500">No assignments found for this course.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
