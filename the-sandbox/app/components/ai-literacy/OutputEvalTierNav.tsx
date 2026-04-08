'use client'

import { OUTPUT_EVAL_TIERS } from '../../lib/output-eval-constants'
import { Shield, Eye, Gem } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TIER_ICONS: Record<number, LucideIcon> = { 1: Eye, 2: Shield, 3: Gem }
const DIFFICULTY_STYLES: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
}

interface Props {
  activeTier: number | null
  onSelectTier: (tier: number) => void
  tierProgress?: Record<number, { attempts: number; bestScore: number }>
}

export default function OutputEvalTierNav({ activeTier, onSelectTier, tierProgress }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {OUTPUT_EVAL_TIERS.map((tier) => {
        const Icon = TIER_ICONS[tier.id]
        const isActive = activeTier === tier.id
        const progress = tierProgress?.[tier.id]

        return (
          <button
            key={tier.id}
            onClick={() => onSelectTier(tier.id)}
            className={`text-left p-6 rounded-2xl border shadow-sm transition-all ${
              isActive
                ? 'border-[#0033A0] bg-[#0033A0]/5 ring-2 ring-[#0033A0]/20'
                : 'border-gray-200 bg-white hover:border-[#0033A0]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center justify-center size-10 rounded-lg ${
                isActive ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {Icon && <Icon className="size-5" />}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[tier.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                {tier.difficulty}
              </span>
            </div>
            <h3 className="font-extrabold text-gray-900 mb-1">Tier {tier.id}: {tier.name}</h3>
            <p className="text-sm text-gray-500">{tier.description}</p>
            {progress && progress.attempts > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
                <span>{progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}</span>
                <span>Best: {progress.bestScore}%</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
