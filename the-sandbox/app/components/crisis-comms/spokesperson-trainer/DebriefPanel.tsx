'use client'

import { Award } from 'lucide-react'
import type { DrillScores } from '../../../lib/crisis-comms/spokesperson-trainer/types'
import ScoreBar from './ScoreBar'

interface DebriefPanelProps {
  scores: DrillScores
  scenarioTitle: string | null
  difficulty: string
}

export default function DebriefPanel({ scores, scenarioTitle, difficulty }: DebriefPanelProps) {
  const avg = (scores.clarity + scores.empathy + scores.speculationControl + scores.messageDiscipline) / 4
  const avgColor = avg >= 8 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
    avg >= 5 ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-red-600 border-red-200 bg-red-50'

  const diffLabel = difficulty === 'warmup' ? 'Warm-up' : difficulty === 'hostile' ? 'Hostile' : 'Standard'
  const diffColor = difficulty === 'warmup' ? 'bg-emerald-100 text-emerald-700' :
    difficulty === 'hostile' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-[#0033A0]" />
          <h3 className="text-lg font-extrabold text-gray-900">Drill Debrief</h3>
        </div>
        <div className="flex items-center gap-2">
          {scenarioTitle && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {scenarioTitle}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${diffColor}`}>
            {diffLabel}
          </span>
        </div>
      </div>

      {/* Average score circle */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center size-16 rounded-full border-2 ${avgColor}`}>
          <span className="text-xl font-extrabold">{avg.toFixed(1)}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Overall Score</p>
          <p className="text-xs text-gray-500">Average across all dimensions</p>
        </div>
      </div>

      {/* Score bars */}
      <div className="border rounded-2xl shadow-sm bg-white p-4 space-y-3">
        <ScoreBar label="Clarity" score={scores.clarity} />
        <ScoreBar label="Empathy" score={scores.empathy} />
        <ScoreBar label="Speculation Control" score={scores.speculationControl} />
        <ScoreBar label="Message Discipline" score={scores.messageDiscipline} />
      </div>
    </div>
  )
}
