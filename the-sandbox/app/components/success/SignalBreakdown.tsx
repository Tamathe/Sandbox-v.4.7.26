'use client'

const SIGNAL_LABELS: Record<string, string> = {
  loginFrequency: 'Login Frequency',
  assignmentSubmission: 'Assignments',
  sandyUsageDecay: 'Sandy Usage',
  studySessionCadence: 'Study Sessions',
  conceptMasterySlope: 'Concept Mastery',
  commonsParticipation: 'Commons',
  flashcardConsistency: 'Flashcards',
  gradeTrend: 'Grade Trend',
  toolEngagement: 'Tool Engagement',
  contentAccess: 'Content Access',
  login: 'Login',
  assignments: 'Assignments',
  grades: 'Grades',
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 30) return 'bg-orange-500'
  return 'bg-red-500'
}

interface Signal {
  signal: string
  score: number
  delta?: number
}

export default function SignalBreakdown({ signals }: { signals: Signal[] }) {
  return (
    <div className="space-y-2">
      {signals.map(s => (
        <div key={s.signal} className="flex items-center gap-3">
          <span className="w-32 text-xs text-gray-600 truncate">
            {SIGNAL_LABELS[s.signal] ?? s.signal}
          </span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreColor(s.score)}`}
              style={{ width: `${s.score}%` }}
            />
          </div>
          <span className="w-8 text-xs font-medium text-right">{s.score}</span>
        </div>
      ))}
    </div>
  )
}
