'use client'

import Link from 'next/link'
import { Zap, MapPin, Moon, Trophy, DollarSign, Clock, Sun, CheckCircle, Star, Stethoscope } from 'lucide-react'
import type { BeaconItem, BeaconType } from '../../lib/student-home-data'

const URGENCY_COLORS: Record<string, { bg: string; border: string }> = {
  critical:    { bg: 'bg-red-50',   border: 'border-red-400' },
  warning:     { bg: 'bg-amber-50', border: 'border-amber-400' },
  info:        { bg: 'bg-blue-50',  border: 'border-blue-400' },
  celebration: { bg: 'bg-green-50', border: 'border-green-400' },
}

const BEACON_ICONS: Record<BeaconType, { icon: typeof Zap; iconBg: string; iconColor: string }> = {
  'scholarship':      { icon: Zap,         iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
  'class':            { icon: MapPin,      iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
  'deadline':         { icon: Clock,       iconBg: 'bg-red-100',     iconColor: 'text-red-600' },
  'financial':        { icon: DollarSign,  iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
  'celebration':      { icon: Trophy,      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  'rest':             { icon: Moon,        iconBg: 'bg-gray-100',    iconColor: 'text-gray-600' },
  'morning-briefing': { icon: Sun,         iconBg: 'bg-sky-100',     iconColor: 'text-sky-600' },
  'all-clear':        { icon: CheckCircle, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  'grade-posted':     { icon: Star,        iconBg: 'bg-violet-100',  iconColor: 'text-violet-600' },
  'virtual-clinic-first-visit': { icon: Stethoscope, iconBg: 'bg-blue-100', iconColor: 'text-[#0033A0]' },
}

export default function BeaconCard({ beacon }: { beacon: BeaconItem }) {
  const urgency = URGENCY_COLORS[beacon.urgency] ?? URGENCY_COLORS.info
  const style = BEACON_ICONS[beacon.type]
  const Icon = style.icon

  return (
    <div>
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-l-4 ${urgency.border} ${urgency.bg}`}>
        <div className={`size-8 rounded-lg ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`size-5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-900 truncate">{beacon.title}</span>
          {beacon.subtitle && (
            <>
              <span className="text-sm text-gray-400">&mdash;</span>
              <span className="text-sm text-gray-600 truncate">{beacon.subtitle}</span>
            </>
          )}
        </div>
        {beacon.sandyAction && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('sandy-prefill', {
                detail: { message: beacon.sandyAction!.message, autoSend: true }
              }))
            }}
            className="text-xs font-semibold text-white bg-[#0033A0] px-3 py-1.5 rounded-lg hover:bg-[#002280] transition-colors whitespace-nowrap flex-shrink-0"
          >
            {beacon.sandyAction.label}
          </button>
        )}
        {beacon.action && (
          beacon.action.href.startsWith('#') ? (
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector(`[data-section="${beacon.action!.href.slice(1)}"]`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="text-xs font-semibold text-[#0033A0] hover:underline whitespace-nowrap flex-shrink-0"
            >
              {beacon.action.label}
            </button>
          ) : (
            <Link
              href={beacon.action.href}
              className="text-xs font-semibold text-[#0033A0] hover:underline whitespace-nowrap flex-shrink-0"
            >
              {beacon.action.label}
            </Link>
          )
        )}
      </div>
      {beacon.type === 'rest' && (
        <p className="text-xs text-gray-400 mt-1.5 ml-4">
          UK Counseling: (859) 257-8701 &middot; Crisis Text Line: Text HOME to 741741
        </p>
      )}
    </div>
  )
}
