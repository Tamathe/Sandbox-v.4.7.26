'use client'

import {
  ClipboardCheck,
  Stethoscope,
  Award,
  GraduationCap,
  Star,
} from 'lucide-react'
import type { ArcMilestone } from '../../lib/constellation-service'

interface MilestoneMarkerProps {
  milestone: ArcMilestone
}

const ICON_MAP: Record<ArcMilestone['type'], React.ComponentType<{ className?: string }>> = {
  exam: ClipboardCheck,
  rotation: Stethoscope,
  capstone: Award,
  graduation: GraduationCap,
  custom: Star,
}

function statusColor(status: ArcMilestone['status']): string {
  if (status === 'completed') return 'bg-green-500 text-white'
  if (status === 'upcoming') return 'text-white'
  return 'bg-gray-300 text-gray-600'
}

export default function MilestoneMarker({ milestone }: MilestoneMarkerProps) {
  const Icon = ICON_MAP[milestone.type] ?? Star
  const color = statusColor(milestone.status)
  const isUpcoming = milestone.status === 'upcoming'

  return (
    <div className="flex flex-col items-center gap-1" title={`${milestone.label} — ${milestone.status}`}>
      {/* Diamond shape */}
      <div
        className={`size-8 rotate-45 flex items-center justify-center rounded-sm ${color}`}
        style={isUpcoming ? { backgroundColor: '#0033A0' } : undefined}
      >
        <Icon className="size-4 -rotate-45" />
      </div>
      <span className="text-xs text-gray-600 text-center max-w-[120px] leading-tight">
        {milestone.label}
      </span>
    </div>
  )
}
