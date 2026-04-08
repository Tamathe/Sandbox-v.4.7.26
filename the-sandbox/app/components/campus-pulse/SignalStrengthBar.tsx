'use client'

interface SignalStrengthBarProps {
  strength: number // 0–1
  stream: string
}

const STREAM_COLORS: Record<string, string> = {
  uknow: 'bg-blue-500',
  'email-urgency': 'bg-orange-500',
  'at-risk': 'bg-red-500',
  sentiment: 'bg-purple-500',
  policy: 'bg-emerald-500',
  'office-hours': 'bg-cyan-500',
  'course-posts': 'bg-amber-500',
  submissions: 'bg-rose-500',
}

export default function SignalStrengthBar({ strength, stream }: SignalStrengthBarProps) {
  const color = STREAM_COLORS[stream] || 'bg-gray-500'
  const pct = Math.round(strength * 100)

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}
