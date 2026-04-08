'use client'

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

const TRAJECTORY_CONFIG = {
  improving: { icon: TrendingUp, label: 'Improving', color: 'text-emerald-600 bg-emerald-50' },
  stable: { icon: Minus, label: 'Stable', color: 'text-gray-600 bg-gray-50' },
  declining: { icon: TrendingDown, label: 'Declining', color: 'text-amber-600 bg-amber-50' },
  critical_decline: { icon: AlertTriangle, label: 'Critical Decline', color: 'text-red-600 bg-red-50' },
} as const

export default function TrajectoryBadge({ trajectory }: { trajectory: string }) {
  const config = TRAJECTORY_CONFIG[trajectory as keyof typeof TRAJECTORY_CONFIG] ?? TRAJECTORY_CONFIG.stable
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}
