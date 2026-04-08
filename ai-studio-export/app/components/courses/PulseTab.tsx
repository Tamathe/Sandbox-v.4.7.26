'use client'

import Link from 'next/link'
import { AlertTriangle, BarChart3, BookOpen, Sparkles } from 'lucide-react'
import type { CourseMaterial } from './course-types'
import { getPulseSnapshot } from './course-data'

interface PulseTabProps {
  courseCode: string | undefined
  courseCodeForBuilder: string
  materials: CourseMaterial[]
}

export default function PulseTab({ courseCode, courseCodeForBuilder, materials }: PulseTabProps) {
  const snapshot = getPulseSnapshot(courseCode, materials)

  return (
    <div className="space-y-6">
      {/* Module engagement */}
      <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <BarChart3 className="h-5 w-5 text-[#0033A0]" />
          Module Engagement
        </div>
        <div className="space-y-4">
          {snapshot.modules.map((module, idx) => (
            <div key={module.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>{module.label}</span>
                  {module.warn && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </div>
                <div className="text-xs text-gray-500">
                  {module.pct}% ({module.students} students)
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${module.warn ? 'bg-amber-500' : 'bg-[#0033A0]'}`}
                  style={{ width: `${module.pct}%` }}
                />
              </div>
              {/* Quick action for struggling modules */}
              {module.warn && (
                <div className="mt-2">
                  <Link
                    href={`/builder?course=${encodeURIComponent(courseCodeForBuilder)}&moduleNumber=${idx + 1}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Build a tool for this module
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Common questions */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <BookOpen className="h-5 w-5 text-[#0033A0]" />
          Common Questions This Week
        </div>
        <div className="space-y-3">
          {snapshot.commonQuestions.map((question) => (
            <div
              key={question.question}
              className="flex items-start justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3"
            >
              <div className="text-sm text-gray-700">{question.question}</div>
              <div className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                {question.count} students
              </div>
            </div>
          ))}
        </div>
      </div>

      {snapshot.modules.some((m) => m.warn) && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Attention recommended
          </div>
          Modules with lower engagement may need clearer materials, more guided practice, or a new course tool to reactivate momentum.
        </div>
      )}

      <div className="text-xs text-gray-400">
        Engagement data is simulated for demo purposes. Live analytics require real session tracking.
      </div>
    </div>
  )
}
