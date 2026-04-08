'use client'

import { PROMPT_LAB_LEVELS, type PromptLabLevel } from '../../lib/prompt-lab-constants'
import { Eye, Ruler, BookOpen, GitBranch, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = { Eye, Ruler, BookOpen, GitBranch, RefreshCw }

interface Props {
  activeLevel: number | null
  onSelectLevel: (level: number) => void
  levelProgress?: Record<number, { attempts: number; bestScore: number }>
}

export default function PromptLabLevelNav({ activeLevel, onSelectLevel, levelProgress }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {PROMPT_LAB_LEVELS.map((level) => {
        const Icon = ICON_MAP[level.icon]
        const progress = levelProgress?.[level.id]
        const isActive = activeLevel === level.id

        return (
          <button
            key={level.id}
            onClick={() => onSelectLevel(level.id)}
            className={`text-left p-5 rounded-2xl border shadow-sm transition-all ${
              isActive
                ? 'border-[#0033A0] bg-[#0033A0]/5 ring-2 ring-[#0033A0]/20'
                : 'border-gray-200 bg-white hover:border-[#0033A0]/40 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex items-center justify-center size-9 rounded-lg ${
                isActive ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {Icon && <Icon className="size-5" />}
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase">Level {level.id}</span>
            </div>
            <h3 className="font-extrabold text-gray-900 mb-1">{level.name}</h3>
            <p className="text-xs text-gray-500 mb-2">{level.description}</p>
            <p className="text-xs text-[#0033A0] font-medium">{level.skillFocus}</p>
            {progress && progress.attempts > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
                <span>{progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}</span>
                <span>Best: {progress.bestScore}/10</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
