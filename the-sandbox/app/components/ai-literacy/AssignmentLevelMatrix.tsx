'use client'

import { Ban, MessageSquare, BookOpen, Zap } from 'lucide-react'

export type AssignmentAILevel = 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED'

interface AssignmentEntry {
  assignmentId: string
  title: string
  category: string | null
  level: AssignmentAILevel
  suggestedLevel: AssignmentAILevel
}

interface AssignmentLevelMatrixProps {
  assignments: AssignmentEntry[]
  onChange: (assignmentId: string, level: AssignmentAILevel) => void
}

const LEVELS: { value: AssignmentAILevel; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { value: 'PROHIBITED', label: 'Prohibited', icon: <Ban className="size-3" />, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  { value: 'LIMITED', label: 'Limited', icon: <MessageSquare className="size-3" />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { value: 'GUIDED', label: 'Guided', icon: <BookOpen className="size-3" />, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { value: 'REQUIRED', label: 'Required', icon: <Zap className="size-3" />, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
]

const LEVEL_TOOLTIPS: Record<AssignmentAILevel, string> = {
  PROHIBITED: 'No AI tools permitted. Student must complete all work unassisted.',
  LIMITED: 'AI for brainstorming and grammar only. Core work must be original.',
  GUIDED: 'AI permitted with full disclosure. Student explains what AI did and why.',
  REQUIRED: 'AI use is mandatory. Student must demonstrate AI fluency.',
}

const LEVEL_BADGE: Record<AssignmentAILevel, { bg: string; text: string }> = {
  PROHIBITED: { bg: 'bg-red-100', text: 'text-red-700' },
  LIMITED: { bg: 'bg-amber-100', text: 'text-amber-700' },
  GUIDED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  REQUIRED: { bg: 'bg-purple-100', text: 'text-purple-700' },
}

export default function AssignmentLevelMatrix({ assignments, onChange }: AssignmentLevelMatrixProps) {
  if (assignments.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <p className="text-sm text-gray-600">No assignments found for this course. You can still generate a general AI policy.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {LEVELS.map(l => (
          <div key={l.value} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${l.bg}`} title={LEVEL_TOOLTIPS[l.value]}>
            {l.icon}
            <span className={`text-xs font-medium ${l.color}`}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Assignment list */}
      <div className="space-y-2">
        {assignments.map(a => {
          const badge = LEVEL_BADGE[a.level]
          const wasChanged = a.level !== a.suggestedLevel

          return (
            <div key={a.assignmentId} className="flex items-center justify-between p-3 bg-white border rounded-xl hover:border-gray-300 transition-colors">
              <div className="min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{a.title}</span>
                  {a.category && (
                    <span className="text-xs text-gray-400 shrink-0">({a.category})</span>
                  )}
                  {wasChanged && (
                    <span className="text-[10px] text-blue-500 font-medium shrink-0">modified</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {LEVELS.map(l => {
                  const isSelected = a.level === l.value
                  return (
                    <button
                      key={l.value}
                      onClick={() => onChange(a.assignmentId, l.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? `${badge.bg} ${badge.text} border-current`
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                      }`}
                      title={LEVEL_TOOLTIPS[l.value]}
                    >
                      {l.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
