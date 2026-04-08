'use client'

import { useMemo } from 'react'
import { GraduationCap } from 'lucide-react'
import type { DegreeArc, ArcMilestone } from '../../lib/constellation-service'
import ArcCourseCard from './ArcCourseCard'
import MilestoneMarker from './MilestoneMarker'
import RequirementSidebar from './RequirementSidebar'

interface DegreeArcTimelineProps {
  data: DegreeArc
  currentSemester: string
}

function masteryBadgeColor(m: number): string {
  if (m >= 0.75) return 'bg-green-100 text-green-700'
  if (m >= 0.4) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function semesterBorderClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'border-l-4 border-green-500'
    case 'current':
      return 'border-l-4'
    case 'planned':
      return 'border-l-4 border-dashed border-gray-300'
    default:
      return 'bg-gray-50'
  }
}

export default function DegreeArcTimeline({
  data,
  currentSemester,
}: DegreeArcTimelineProps) {
  // Map milestones to semester labels for positioning
  const milestoneBySemester = useMemo(() => {
    const map = new Map<string, ArcMilestone[]>()
    for (const m of data.milestones) {
      const existing = map.get(m.semesterLabel) ?? []
      existing.push(m)
      map.set(m.semesterLabel, existing)
    }
    return map
  }, [data.milestones])

  const pct =
    data.percentComplete != null ? Math.round(data.percentComplete) : null

  // Empty state
  if (data.semesters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GraduationCap className="size-12 text-gray-300 mb-3" />
        <p className="text-lg font-extrabold text-gray-400">
          No degree plan available
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Your degree arc will appear here once a plan is on file.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Program header */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              {data.program.name}
            </h2>
            <p className="text-xs text-gray-500">
              {data.program.code} · Catalog {data.program.catalogYear} ·{' '}
              {data.program.totalCredits} credits
            </p>
          </div>
          {pct != null && (
            <div className="flex items-center gap-3 min-w-[180px]">
              <div className="flex-1 h-2.5 rounded-full bg-gray-100">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {pct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal scrollable timeline */}
      <div className="overflow-x-auto snap-x snap-mandatory pb-4">
        <div className="flex gap-4 min-w-max">
          {data.semesters.map((semester) => {
            const milestones = milestoneBySemester.get(semester.label) ?? []
            const isCurrent = semester.label === currentSemester

            return (
              <div
                key={semester.label}
                className={`snap-start flex flex-col min-w-[200px] w-[200px] rounded-2xl border-2 border-gray-200 bg-white ${semesterBorderClass(semester.status)}`}
                style={
                  semester.status === 'current'
                    ? {
                        borderLeftColor: '#0033A0',
                        boxShadow: '0 0 12px rgba(0,51,160,0.3)',
                      }
                    : undefined
                }
              >
                {/* Semester header */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-sm font-bold ${
                        isCurrent ? '' : 'text-gray-900'
                      }`}
                      style={isCurrent ? { color: '#0033A0' } : undefined}
                    >
                      {semester.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {semester.totalCredits} cr
                    </span>
                  </div>
                  {semester.aggregateMastery != null && (
                    <span
                      className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${masteryBadgeColor(semester.aggregateMastery)}`}
                    >
                      {Math.round(semester.aggregateMastery * 100)}% mastery
                    </span>
                  )}
                </div>

                {/* Course cards */}
                <div className="flex-1 p-2 space-y-2">
                  {semester.courses.map((course) => (
                    <ArcCourseCard key={course.courseCode} course={course} />
                  ))}
                </div>

                {/* Milestone markers */}
                {milestones.length > 0 && (
                  <div className="border-t border-gray-100 p-2 flex flex-wrap gap-2 justify-center">
                    {milestones.map((m) => (
                      <MilestoneMarker key={m.label} milestone={m} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Graduation column */}
          {data.estimatedGraduation && (
            <div className="snap-start flex flex-col items-center justify-center min-w-[160px] w-[160px] rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4 text-center">
              <GraduationCap className="size-10 mb-2 text-[#0033A0]" />
              <p className="text-sm font-extrabold text-gray-900">
                Graduation
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {data.estimatedGraduation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Requirement sidebar */}
      <RequirementSidebar
        requirements={data.requirementSatisfaction}
        percentComplete={data.percentComplete}
      />
    </div>
  )
}
