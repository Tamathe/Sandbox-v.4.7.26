'use client'

import { BookOpen } from 'lucide-react'

interface JourneyNarrativeProps {
  narrative: string
  trajectory: string
}

const trajectoryLabels: Record<string, { label: string; color: string }> = {
  ascending: { label: 'Ascending', color: 'text-green-700 bg-green-50' },
  stable: { label: 'Stable', color: 'text-blue-700 bg-blue-50' },
  dipping: { label: 'Dipping', color: 'text-amber-700 bg-amber-50' },
  recovering: { label: 'Recovering', color: 'text-cyan-700 bg-cyan-50' },
  declining: { label: 'Declining', color: 'text-red-700 bg-red-50' },
  'insufficient-data': { label: 'Building...', color: 'text-gray-500 bg-gray-50' },
}

export default function JourneyNarrative({ narrative, trajectory }: JourneyNarrativeProps) {
  const t = trajectoryLabels[trajectory] ?? trajectoryLabels['insufficient-data']

  return (
    <div className="border rounded-2xl shadow-sm bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Your Journey</h2>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.color}`}>
          {t.label}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{narrative}</p>
    </div>
  )
}
