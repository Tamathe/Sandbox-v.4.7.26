'use client'

import { Award, Brain, CheckCircle2, XCircle, Sparkles, TrendingUp } from 'lucide-react'

interface TeachBackResultsProps {
  teachingScore: number
  accuracyScore: number
  clarityScore: number
  bloomAchieved: number
  misconceptionsCovered: string[]
  allMisconceptions: string[]
  feedbackNarrative: string
  srBoosted: boolean
}

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function TeachBackResults({
  teachingScore,
  accuracyScore,
  clarityScore,
  bloomAchieved,
  misconceptionsCovered,
  allMisconceptions,
  feedbackNarrative,
  srBoosted,
}: TeachBackResultsProps) {
  const overallPct = Math.round(teachingScore * 100)
  const bloomLabel = BLOOM_LABELS[bloomAchieved] ?? 'Unknown'

  // Gauge: circle with score
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - teachingScore)
  const gaugeColor =
    overallPct >= 80 ? 'stroke-green-500' : overallPct >= 60 ? 'stroke-yellow-500' : 'stroke-red-500'

  return (
    <div className="space-y-6">
      {/* Overall Score Gauge */}
      <div className="border-2 rounded-2xl p-6 bg-white text-center">
        <h3 className="text-lg font-extrabold text-gray-900 mb-4">Teaching Evaluation</h3>
        <div className="flex justify-center mb-4">
          <div className="relative">
            <svg width="128" height="128" className="-rotate-90">
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                className={gaugeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-gray-900">{overallPct}</span>
              <span className="text-xs text-gray-500">out of 100</span>
            </div>
          </div>
        </div>

        {srBoosted && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-4">
            <TrendingUp className="size-4" />
            SR stability boosted 2x
          </div>
        )}
      </div>

      {/* Dimension Scores */}
      <div className="border-2 rounded-2xl p-6 bg-white space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">Dimension Scores</h3>
        <ScoreBar label="Accuracy" value={accuracyScore} />
        <ScoreBar label="Clarity" value={clarityScore} />
      </div>

      {/* Bloom Badge */}
      <div className="border-2 rounded-2xl p-6 bg-white flex items-center gap-4">
        <div className="size-12 rounded-full bg-purple-100 flex items-center justify-center">
          <Brain className="size-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Bloom Level Demonstrated</p>
          <p className="text-lg font-extrabold text-gray-900">
            Level {bloomAchieved}: {bloomLabel}
          </p>
        </div>
      </div>

      {/* Misconception Checklist */}
      {allMisconceptions.length > 0 && (
        <div className="border-2 rounded-2xl p-6 bg-white space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900">Misconceptions Coverage</h3>
          <div className="space-y-2">
            {allMisconceptions.map((m, i) => {
              const covered = misconceptionsCovered.includes(m)
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {covered ? (
                    <CheckCircle2 className="size-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-gray-300 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={covered ? 'text-gray-800' : 'text-gray-400'}>{m}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Feedback Narrative */}
      <div className="border-2 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#0033A0]" />
          <h3 className="text-sm font-extrabold text-gray-900">Coaching Feedback</h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{feedbackNarrative}</p>
      </div>
    </div>
  )
}
