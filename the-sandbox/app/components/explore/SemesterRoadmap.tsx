'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'

interface TimelineEstimate {
  program: string
  programName: string
  creditsCompleted: number
  creditsRemaining: number
  estimatedSemesters: number
  estimatedGraduation: string
  bottleneck: string | null
}

interface RequirementResult {
  requirementName: string
  category: string
  status: 'SATISFIED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'DEFICIENT'
  creditsRequired: number
  creditsCompleted: number
  creditsInProgress: number
  satisfyingCourses: string[]
  missingSuggestions: string[]
}

interface SemesterRoadmapProps {
  timeline: TimelineEstimate
  requirements: RequirementResult[]
  transferCourses: string[]
}

interface SemesterPlan {
  label: string
  courses: { code: string; isTransfer: boolean }[]
  totalCredits: number
}

function buildSemesterPlan(
  timeline: TimelineEstimate,
  requirements: RequirementResult[],
  transferCourses: string[],
): SemesterPlan[] {
  const transferSet = new Set(transferCourses.map((c) => c.toUpperCase()))

  // Gather all missing courses from requirements
  const missingCourses = requirements
    .flatMap((r) => r.missingSuggestions)
    .map((s) => s.split(' — ')[0].trim())
    .filter(Boolean)

  // Remove duplicates
  const unique = [...new Set(missingCourses)]

  // Distribute across semesters (15 credits / ~5 courses per semester)
  const coursesPerSemester = 5
  const semesters: SemesterPlan[] = []

  // Determine starting semester
  const now = new Date()
  const month = now.getMonth()
  const semesterNames = ['Spring', 'Summer', 'Fall']
  let semIdx = month < 5 ? 0 : month < 8 ? 1 : 2
  let year = now.getFullYear()

  // Advance to next semester
  semIdx++
  if (semIdx >= semesterNames.length) {
    semIdx = 0
    year++
  }

  for (let i = 0; i < timeline.estimatedSemesters && i < 10; i++) {
    const start = i * coursesPerSemester
    const semCourses = unique.slice(start, start + coursesPerSemester)

    if (semCourses.length > 0 || i < timeline.estimatedSemesters) {
      semesters.push({
        label: `${semesterNames[semIdx]} ${year}`,
        courses: semCourses.map((code) => ({
          code,
          isTransfer: transferSet.has(code.toUpperCase()),
        })),
        totalCredits: semCourses.length * 3,
      })
    }

    semIdx++
    if (semIdx >= semesterNames.length) {
      semIdx = 0
      year++
    }
  }

  return semesters
}

export default function SemesterRoadmap({
  timeline,
  requirements,
  transferCourses,
}: SemesterRoadmapProps) {
  const [expanded, setExpanded] = useState(false)

  if (timeline.estimatedSemesters === 0) return null

  const semesters = expanded
    ? buildSemesterPlan(timeline, requirements, transferCourses)
    : []

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-[#0033A0]" />
          <h3 className="text-base font-extrabold text-gray-900">
            Semester Roadmap &mdash; {timeline.programName}
          </h3>
        </div>
        {expanded ? (
          <ChevronUp className="size-5 text-gray-400" />
        ) : (
          <ChevronDown className="size-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {semesters.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No additional semesters needed.
            </p>
          ) : (
            semesters.map((sem) => (
              <div key={sem.label}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900">{sem.label}</h4>
                  <span className="text-xs text-gray-400">
                    ~{sem.totalCredits} credits
                  </span>
                </div>
                {sem.courses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sem.courses.map((c) => (
                      <span
                        key={c.code}
                        className={`text-xs font-semibold rounded-lg px-3 py-1.5 border ${
                          c.isTransfer
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-[#0033A0]/5 text-[#0033A0] border-[#0033A0]/10'
                        }`}
                      >
                        {c.code}
                        {c.isTransfer && (
                          <span className="text-[10px] ml-1 opacity-60">DONE</span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Remaining electives or advisor-selected courses
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
