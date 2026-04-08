'use client'

import { AlertTriangle } from 'lucide-react'
import type { ArcCourse } from '../../lib/constellation-service'

interface ArcCourseCardProps {
  course: ArcCourse
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase().charAt(0)
  if (g === 'A' || g === 'B') return 'bg-green-100 text-green-700'
  if (g === 'C') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function masteryColor(m: number): string {
  if (m >= 0.75) return 'bg-green-500'
  if (m >= 0.4) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function ArcCourseCard({ course }: ArcCourseCardProps) {
  return (
    <div
      className={`relative rounded-2xl border-2 border-gray-200 bg-white p-3 ${
        course.status === 'WAIVED' ? 'bg-gray-50' : ''
      }`}
    >
      {/* Header row: course code + grade badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {course.courseCode}
          </p>
          <p className="text-xs text-gray-500 truncate">{course.title}</p>
        </div>
        {course.grade && (
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColor(course.grade)}`}
          >
            {course.grade}
          </span>
        )}
      </div>

      {/* Mastery bar */}
      {course.mastery != null && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <div
              className={`h-1.5 rounded-full ${masteryColor(course.mastery)}`}
              style={{ width: `${Math.round(course.mastery * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom row: credits + status badges */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {course.credits} cr
        </span>

        {course.status === 'WAIVED' && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 font-medium">
            Waived
          </span>
        )}

        {course.satisfiesRequirement && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#0033A0]">
            {course.satisfiesRequirement}
          </span>
        )}
      </div>

      {/* Prerequisite warning */}
      {!course.prerequisitesMet && (
        <div className="mt-2 flex items-center gap-1 text-amber-600">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="text-xs">Prerequisites not met</span>
        </div>
      )}
    </div>
  )
}
