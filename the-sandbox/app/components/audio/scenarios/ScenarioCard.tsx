'use client'

import { Users, Mic, Scale, Swords } from 'lucide-react'
import type { ScenarioTemplateType } from '../../../lib/audio/types'

const TEMPLATE_ICONS: Record<ScenarioTemplateType, React.ElementType> = {
  clinical: Users,
  interview: Mic,
  debate: Swords,
  roleplay: Scale,
}

const TEMPLATE_COLORS: Record<ScenarioTemplateType, string> = {
  clinical: 'from-emerald-500 to-teal-600',
  interview: 'from-blue-500 to-indigo-600',
  debate: 'from-amber-500 to-orange-600',
  roleplay: 'from-purple-500 to-violet-600',
}

interface Props {
  scenario: {
    id: string
    templateType: string
    title: string
    description: string
    timesPlayed: number
    avgScore: number | null
    persona: unknown
  }
  onClick: (id: string) => void
}

export default function ScenarioCard({ scenario, onClick }: Props) {
  const type = scenario.templateType as ScenarioTemplateType
  const Icon = TEMPLATE_ICONS[type] ?? Users
  const gradient = TEMPLATE_COLORS[type] ?? 'from-gray-500 to-gray-600'

  return (
    <button
      type="button"
      onClick={() => onClick(scenario.id)}
      className="text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4"
    >
      <div className={`flex items-center justify-center size-12 bg-gradient-to-br ${gradient} rounded-xl text-white mb-3`}>
        <Icon className="size-5" />
      </div>
      <h3 className="font-extrabold text-sm text-gray-900 line-clamp-2">{scenario.title}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scenario.description}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        <span className="capitalize">{type}</span>
        <span>{scenario.timesPlayed} plays</span>
        {scenario.avgScore !== null && <span>Avg: {scenario.avgScore.toFixed(1)}/10</span>}
      </div>
    </button>
  )
}
