'use client'

import { useState } from 'react'
import { Calculator, ChevronDown, ChevronUp, Target } from 'lucide-react'
import type { CourseGradeScenario } from '../../lib/student-home-data'

const FEASIBILITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  easy:     { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Easy' },
  doable:   { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Doable' },
  stretch:  { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Stretch' },
  unlikely: { bg: 'bg-red-50', text: 'text-red-700', label: 'Tough' },
}

function ScenarioBar({ scenario }: { scenario: CourseGradeScenario['scenarios'][0] }) {
  const style = FEASIBILITY_STYLES[scenario.feasibility]
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-xs font-bold text-gray-600 text-right">{scenario.targetLetter}</span>
      <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all ${
            scenario.feasibility === 'easy' ? 'bg-emerald-400' :
            scenario.feasibility === 'doable' ? 'bg-blue-400' :
            scenario.feasibility === 'stretch' ? 'bg-amber-400' : 'bg-red-400'
          }`}
          style={{ width: `${scenario.neededOnRemaining}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
          {scenario.neededOnRemaining}%
        </span>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} w-12 text-center`}>
        {style.label}
      </span>
    </div>
  )
}

function CourseCard({ course }: { course: CourseGradeScenario }) {
  const [expanded, setExpanded] = useState(false)
  const bestAchievable = course.scenarios[0]
  const currentNeededForB = course.scenarios.find(s => s.targetLetter === 'B')

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#0033A0]/30 transition-all">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0033A0]">{course.courseCode}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">{course.courseTitle}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-extrabold text-gray-900">
              Currently: {course.currentGrade}% ({course.currentLetter})
            </span>
            {currentNeededForB && (
              <span className="text-xs text-gray-400">
                Need <span className="font-bold text-gray-600">{currentNeededForB.neededOnRemaining}%</span> on remaining for a B
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{course.remainingWeight}% remaining</span>
          {expanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded — grade scenarios */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
            Score needed on remaining work ({course.remainingItems.map(i => i.title).join(', ')})
          </p>
          <div className="space-y-1.5">
            {course.scenarios.map(scenario => (
              <ScenarioBar key={scenario.targetLetter} scenario={scenario} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {course.remainingItems.map(item => (
              <span key={item.title} className="text-[10px] text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">
                {item.title} ({item.weight}% · {item.type})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinalsCalculator({ courses }: { courses: CourseGradeScenario[] }) {
  if (courses.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="size-4 text-[#0033A0]" />
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Grade Calculator</h3>
        <span className="text-[10px] text-gray-400 font-medium ml-1">What do you need on the final?</span>
      </div>
      <div className="space-y-2">
        {courses.map(course => (
          <CourseCard key={course.courseCode} course={course} />
        ))}
      </div>
    </div>
  )
}
