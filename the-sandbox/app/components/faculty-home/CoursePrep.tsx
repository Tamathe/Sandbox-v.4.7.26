'use client'

import { CheckSquare, Square, ArrowRight, Bot } from 'lucide-react'
import Link from 'next/link'
import type { CoursePrepEntry } from '../../lib/faculty/day-lifecycle-service'

export default function CoursePrep({
  courses,
  onAskSandyToPrep,
}: {
  courses: CoursePrepEntry[]
  onAskSandyToPrep: (courseCode: string, checks: { label: string; done: boolean; detail?: string }[]) => void
}) {
  if (courses.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-extrabold text-gray-900">Course Prep — Tomorrow&apos;s Classes</h2>
      </div>

      <div className="divide-y divide-gray-50 px-5 py-2">
        {courses.map((course) => (
          <div key={course.courseId} className="py-3">
            {/* Course header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#0033A0]">{course.courseCode}</span>
                <span className="mx-1.5 text-gray-300">—</span>
                <span className="text-sm text-gray-600">{course.courseTitle}</span>
                {course.classTime && (
                  <span className="ml-2 text-xs text-gray-400">({course.classTime})</span>
                )}
              </div>
              {!course.hasClassTomorrow && (
                <span className="text-xs text-gray-400">No class tomorrow</span>
              )}
            </div>

            {/* Checklist */}
            {course.hasClassTomorrow ? (
              <div className="mt-2 space-y-1.5">
                {course.checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {check.done ? (
                      <CheckSquare className="mt-0.5 size-3.5 shrink-0 text-green-500" />
                    ) : (
                      <Square className="mt-0.5 size-3.5 shrink-0 text-gray-300" />
                    )}
                    <div>
                      <span className={check.done ? 'text-gray-500' : 'text-gray-900'}>{check.label}</span>
                      {check.detail && (
                        <span className="ml-1.5 text-xs text-gray-400">({check.detail})</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Actions */}
                <div className="mt-2 flex items-center gap-3">
                  <Link
                    href="/courses"
                    className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    Open course <ArrowRight className="size-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onAskSandyToPrep(course.courseCode, course.checks)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                  >
                    <Bot className="size-3" />
                    Ask Sandy to prep
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400">No prep needed</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
