'use client'

import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'

import type { ToolDeploymentBadge, ToolDeploymentSummary } from '../lib/tool-deployment'

const BADGE_STYLES: Record<string, string> = {
  slate: 'border-gray-200 bg-gray-100 text-gray-700',
  blue: 'border-blue-200 bg-blue-50 text-[#0033A0]',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-700',
}

function badgeIcon(kind: ToolDeploymentBadge['kind']) {
  switch (kind) {
    case 'department-template':
      return <Building2 className="size-3" />
    case 'official':
      return <ShieldCheck className="size-3" />
    case 'reviewed':
      return <BadgeCheck className="size-3" />
    case 'requires-approval':
    case 'review-expired':
      return <AlertTriangle className="size-3" />
    case 'uses-institutional-data':
      return <GraduationCap className="size-3" />
    case 'state':
    default:
      return <Building2 className="size-3" />
  }
}

interface ToolDeploymentBadgesProps {
  deployment?: ToolDeploymentSummary | null
  maxBadges?: number
  omitKinds?: ToolDeploymentBadge['kind'][]
}

export default function ToolDeploymentBadges({
  deployment,
  maxBadges,
  omitKinds = [],
}: ToolDeploymentBadgesProps) {
  const badges = (deployment?.badges ?? []).filter(
    (badge) => !omitKinds.includes(badge.kind),
  )
  const visibleBadges =
    typeof maxBadges === 'number' ? badges.slice(0, maxBadges) : badges

  if (visibleBadges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visibleBadges.map((badge) => (
        <span
          key={`${badge.kind}-${badge.label}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${BADGE_STYLES[badge.tone] ?? BADGE_STYLES.slate}`}
        >
          {badgeIcon(badge.kind)}
          {badge.label}
        </span>
      ))}
    </div>
  )
}
