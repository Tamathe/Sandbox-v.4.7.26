'use client'

const SEVERITY_CONFIG = {
  WATCH: { label: 'Watch', color: 'bg-yellow-100 text-yellow-800' },
  CONCERN: { label: 'Concern', color: 'bg-amber-100 text-amber-800' },
  URGENT: { label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800' },
} as const

export default function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.WATCH

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  )
}
