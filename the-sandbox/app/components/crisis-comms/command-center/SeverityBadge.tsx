'use client'

import type { SeverityLevel } from '../../../lib/crisis-comms/command-center/types'

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string }> = {
  1: { label: 'Low', className: 'bg-amber-100 text-amber-800' },
  2: { label: 'Moderate', className: 'bg-orange-100 text-orange-800' },
  3: { label: 'Critical', className: 'bg-red-100 text-red-800' },
}

export default function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const config = SEVERITY_CONFIG[severity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}
