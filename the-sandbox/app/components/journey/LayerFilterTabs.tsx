'use client'

import { BookOpen, Brain, GraduationCap, Users, Heart, Building } from 'lucide-react'
import type { JourneyLayer } from '../../lib/journey/types'

interface LayerFilterTabsProps {
  active: JourneyLayer | 'all'
  onChange: (layer: JourneyLayer | 'all') => void
}

const layers: Array<{ key: JourneyLayer | 'all'; label: string; icon: typeof BookOpen }> = [
  { key: 'all', label: 'All', icon: BookOpen },
  { key: 'academic', label: 'Academic', icon: GraduationCap },
  { key: 'mastery', label: 'Mastery', icon: Brain },
  { key: 'study', label: 'Study', icon: BookOpen },
  { key: 'social', label: 'Social', icon: Users },
  { key: 'wellness', label: 'Wellness', icon: Heart },
  { key: 'campus', label: 'Campus', icon: Building },
]

export default function LayerFilterTabs({ active, onChange }: LayerFilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {layers.map(l => {
        const Icon = l.icon
        const isActive = active === l.key
        return (
          <button
            key={l.key}
            onClick={() => onChange(l.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? 'bg-[#0033A0] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="size-3.5" />
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
