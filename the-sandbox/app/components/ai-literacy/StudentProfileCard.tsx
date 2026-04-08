'use client'

import { Sparkles } from 'lucide-react'

interface StudentProfileCardProps {
  profile: {
    practicalSkill: number
    communication: number
    skepticism: number
    judgment: number
    readiness: number
  }
  readinessBand: { label: string; key: string }
}

const DIMENSIONS = [
  { key: 'practicalSkill', label: 'Practical Skill', color: 'bg-blue-500' },
  { key: 'communication', label: 'Communication', color: 'bg-green-500' },
  { key: 'skepticism', label: 'Skepticism', color: 'bg-amber-500' },
  { key: 'judgment', label: 'Judgment', color: 'bg-purple-500' },
] as const

export default function StudentProfileCard({ profile, readinessBand }: StudentProfileCardProps) {
  const isAIReady = profile.readiness > 75

  return (
    <div className="border-2 border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-gray-900">Your AI Profile</h3>
        {isAIReady ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            <Sparkles className="size-3" /> AI Ready
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
            {readinessBand.label}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {DIMENSIONS.map((dim) => {
          const value = profile[dim.key]
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{dim.label}</span>
                <span className="text-xs text-gray-400">{value}/100</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${dim.color}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
