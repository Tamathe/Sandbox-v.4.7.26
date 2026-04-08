'use client'

type ProgressiveProfileCardProps = {
  profile: {
    comfort: number
    pedagogyAlignment: number
    curiosity: number
    ethicalAwareness: number
    currentUsage: number
    readiness: number
    modulesCompleted: number
    lastScoredAt: string | null
  }
  readinessBand: { label: string; key: string }
}

const DIMENSIONS: { key: keyof ProgressiveProfileCardProps['profile']; label: string }[] = [
  { key: 'comfort', label: 'Comfort' },
  { key: 'pedagogyAlignment', label: 'Pedagogy Alignment' },
  { key: 'curiosity', label: 'Curiosity' },
  { key: 'ethicalAwareness', label: 'Ethical Awareness' },
  { key: 'currentUsage', label: 'Current Usage' },
]

const BAND_COLORS: Record<string, string> = {
  starting: 'bg-gray-100 text-gray-700',
  foundations: 'bg-blue-100 text-blue-700',
  confidence: 'bg-green-100 text-green-700',
  leading: 'bg-amber-100 text-amber-700',
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  return `Updated ${days} days ago`
}

export default function ProgressiveProfileCard({ profile, readinessBand }: ProgressiveProfileCardProps) {
  return (
    <div className="border rounded-2xl shadow-sm p-6 mb-6 bg-white">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-extrabold text-lg text-gray-900">Your AI Profile</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${BAND_COLORS[readinessBand.key] ?? BAND_COLORS.starting}`}>
          {readinessBand.label}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Powered by your activity</p>

      <div className="space-y-3">
        {DIMENSIONS.map(({ key, label }) => {
          const value = profile[key] as number
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{label}</span>
                <span className="text-gray-500 font-medium">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-[#0033A0] transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {profile.lastScoredAt && (
        <p className="text-xs text-gray-400 mt-4">{relativeTime(profile.lastScoredAt)}</p>
      )}
    </div>
  )
}
