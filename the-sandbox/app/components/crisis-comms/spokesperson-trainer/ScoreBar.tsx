'use client'

interface ScoreBarProps {
  label: string
  score: number
  maxScore?: number
}

export default function ScoreBar({ label, score, maxScore = 10 }: ScoreBarProps) {
  const pct = Math.min((score / maxScore) * 100, 100)
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = score >= 8 ? 'text-emerald-700' : score >= 5 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-bold ${textColor}`}>{score}/{maxScore}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
