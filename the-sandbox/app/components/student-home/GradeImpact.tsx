'use client'

import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { GradeImpactItem } from '../../lib/student-home-data'

export default function GradeImpact({ grades }: { grades: GradeImpactItem[] }) {
  if (grades.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recent Grades</h3>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {grades.length} new
        </span>
      </div>

      <div className="space-y-2.5">
        {grades.map((grade) => (
          <div
            key={grade.id}
            className={`bg-white rounded-2xl border-2 overflow-hidden ${
              grade.isPositive ? 'border-emerald-200/70' : 'border-amber-200/70'
            }`}
          >
            {/* Main row */}
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Score circle */}
              <div className={`size-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                grade.isPositive ? 'bg-emerald-50' : 'bg-amber-50'
              }`}>
                <div className="text-center">
                  <div className={`text-lg font-extrabold leading-none ${
                    grade.isPositive ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {grade.score}
                  </div>
                  <div className="text-[9px] text-gray-400 font-medium">/{grade.maxScore}</div>
                </div>
              </div>

              {/* Assignment info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">{grade.courseCode}</span>
                  <span className="text-[10px] text-gray-300">{grade.postedAt}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">{grade.assignmentTitle}</p>
              </div>

              {/* Letter grade */}
              <div className={`text-xl font-extrabold flex-shrink-0 ${
                grade.isPositive ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {grade.letterGrade}
              </div>
            </div>

            {/* Impact strip */}
            <div className={`px-4 py-2 border-t flex items-center gap-4 text-xs ${
              grade.isPositive
                ? 'bg-emerald-50/50 border-emerald-100'
                : 'bg-amber-50/50 border-amber-100'
            }`}>
              {grade.isPositive ? (
                <TrendingUp className="size-3.5 text-emerald-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="size-3.5 text-amber-500 flex-shrink-0" />
              )}

              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Course grade impact */}
                <span className="text-gray-500">
                  Course: <span className="font-bold text-gray-700">{grade.impact.courseGradeBefore}</span>
                  <span className="mx-0.5">→</span>
                  <span className={`font-bold ${grade.isPositive ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {grade.impact.courseGradeAfter}
                  </span>
                </span>

                <span className="text-gray-200">|</span>

                {/* Semester GPA impact */}
                <span className="text-gray-500">
                  Sem GPA: <span className="font-bold text-gray-700">{grade.impact.semesterGpaBefore.toFixed(2)}</span>
                  <span className="mx-0.5">→</span>
                  <span className={`font-bold ${grade.isPositive ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {grade.impact.semesterGpaAfter.toFixed(2)}
                  </span>
                </span>

                <span className="text-gray-200">|</span>

                {/* Cumulative GPA impact */}
                <span className="text-gray-500">
                  GPA: <span className="font-bold text-gray-700">{grade.impact.cumulativeGpaBefore.toFixed(2)}</span>
                  <span className="mx-0.5">→</span>
                  <span className={`font-bold ${grade.isPositive ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {grade.impact.cumulativeGpaAfter.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>

            {/* Action for negative grades — empathetic, not punishing */}
            {!grade.isPositive && (
              <div className="px-4 py-2 border-t border-amber-100 bg-white flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  You can recover this. A <span className="font-bold text-gray-700">B+</span> on the remaining TEK-100 work brings you back to a <span className="font-bold text-gray-700">C+</span>.
                </p>
                <Link
                  href="/courses"
                  className="text-xs font-semibold text-[#0033A0] hover:text-blue-700 flex items-center gap-1 flex-shrink-0 transition-colors"
                >
                  View Plan <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
