'use client'

import { AlertTriangle, BookOpen, ClipboardCheck, Plus, Upload, Users } from 'lucide-react'
import type { Course } from './course-types'
import type { CourseSummaryItem } from '../../lib/course-summary-service'

interface CourseTriageGridProps {
  courses: Course[]
  summaryMap: Record<string, CourseSummaryItem>
  onSelectCourse: (courseId: string) => void
  onNewCourse: () => void
  onCanvasImport: () => void
}

export default function CourseTriageGrid({
  courses,
  summaryMap,
  onSelectCourse,
  onNewCourse,
  onCanvasImport,
}: CourseTriageGridProps) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">All Courses</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewCourse}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
          >
            <Plus className="size-4" />
            New Course
          </button>
          <button
            type="button"
            onClick={onCanvasImport}
            title="Import from Canvas"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#0033A0] px-3 py-2 text-sm font-semibold text-[#0033A0] transition-colors hover:bg-blue-50"
          >
            <Upload className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const summary = summaryMap[course.id]
          const hasAttention = summary && (summary.ungradedCount > 0 || summary.atRiskInactive7d > 0 || summary.atRiskMissed2plus > 0)
          const borderColor = !summary
            ? 'border-l-gray-200'
            : hasAttention
              ? 'border-l-amber-400'
              : 'border-l-green-400'

          return (
            <button
              key={course.id}
              type="button"
              onClick={() => onSelectCourse(course.id)}
              className={`group ${borderColor} border-l-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm text-left transition-all hover:shadow-md`}
            >
              <span className="mb-1 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
                {course.courseCode}
              </span>
              <h3 className="mb-3 text-sm font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors">
                {course.title}
              </h3>

              {summary ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {summary.enrollmentCount} enrolled
                    </span>
                    {summary.averageGrade != null && (
                      <span>Avg: {Math.round(summary.averageGrade)}%</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {summary.ungradedCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <ClipboardCheck className="size-3" />
                        {summary.ungradedCount} ungraded
                      </span>
                    )}
                    {(summary.atRiskInactive7d > 0 || summary.atRiskMissed2plus > 0) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        <AlertTriangle className="size-3" />
                        {summary.atRiskInactive7d + summary.atRiskMissed2plus} at-risk
                      </span>
                    )}
                  </div>
                  {summary.upcomingDeadlines.length > 0 && (
                    <p className="text-[10px] text-gray-400">
                      Next due: {new Date(summary.upcomingDeadlines[0].dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {summary.upcomingDeadlines[0].title}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="size-3.5" />
                    {course._count.materials} material{course._count.materials !== 1 ? 's' : ''}
                  </span>
                  <span className="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
