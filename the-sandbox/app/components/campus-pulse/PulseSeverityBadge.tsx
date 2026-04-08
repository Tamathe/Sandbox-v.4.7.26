'use client'

import { AlertTriangle, AlertOctagon, Info, ShieldAlert } from 'lucide-react'

const SEVERITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof AlertTriangle }
> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: AlertOctagon,
  },
  high: {
    label: 'High',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    icon: ShieldAlert,
  },
  medium: {
    label: 'Medium',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: Info,
  },
}

interface PulseSeverityBadgeProps {
  severity: string
  size?: 'sm' | 'md'
}

export default function PulseSeverityBadge({ severity, size = 'sm' }: PulseSeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low
  const Icon = config.icon
  const iconSize = size === 'sm' ? 'size-3' : 'size-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${config.bg} ${config.text} ${textSize} ${padding}`}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  )
}
