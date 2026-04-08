'use client'

import { useEffect, useState } from 'react'

interface GradeItem {
  id: string
  aiScore: number | null
  facultyScore: number | null
  status: string
  submission: {
    submittedAt: string | null
    assignment: {
      title: string
      pointsPossible: number
    }
  }
}

interface RecentGradesWidgetProps {
  courseId: string
  userEmail: string
  onSwitchToAssignments: () => void
}

export default function RecentGradesWidget({
  courseId,
  userEmail,
  onSwitchToAssignments,
}: RecentGradesWidgetProps) {
  const [grades, setGrades] = useState<GradeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/my-grades`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: GradeItem[]) => {
        // Show only graded items (have a score), most recent first, limit 5
        const graded = (Array.isArray(data) ? data : [])
          .filter((g) => g.facultyScore !== null || g.aiScore !== null)
          .slice(0, 5)
        setGrades(graded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [courseId, userEmail])

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading grades...</p>
  }

  if (grades.length === 0) {
    return <p className="text-sm text-gray-500">No graded work yet.</p>
  }

  return (
    <div className="space-y-2">
      {grades.map((g) => {
        const score = g.facultyScore ?? g.aiScore ?? 0
        const max = g.submission.assignment.pointsPossible
        const pct = max > 0 ? Math.round((score / max) * 100) : 0
        return (
          <div key={g.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-gray-700">{g.submission.assignment.title}</span>
            <span className={`font-semibold tabular-nums ${pct >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
              {score}/{max}
            </span>
          </div>
        )
      })}
      <button
        type="button"
        onClick={onSwitchToAssignments}
        className="mt-1 text-xs font-semibold text-[#0033A0] hover:underline"
      >
        View all grades
      </button>
    </div>
  )
}
