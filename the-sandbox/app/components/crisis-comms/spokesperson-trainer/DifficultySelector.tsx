'use client'

import type { Difficulty } from '../../../lib/crisis-comms/spokesperson-trainer/types'

interface DifficultySelectorProps {
  selected: Difficulty
  onSelect: (difficulty: Difficulty) => void
}

const LEVELS: { id: Difficulty; label: string; desc: string; color: string; activeColor: string }[] = [
  {
    id: 'warmup',
    label: 'Warm-up',
    desc: 'Friendly local reporter, 5-6 questions',
    color: 'text-emerald-600',
    activeColor: 'bg-emerald-500 text-white',
  },
  {
    id: 'standard',
    label: 'Standard',
    desc: 'Skeptical beat reporter, 7-8 questions',
    color: 'text-[#0033A0]',
    activeColor: 'bg-[#0033A0] text-white',
  },
  {
    id: 'hostile',
    label: 'Hostile',
    desc: 'National investigative journalist, 9-10 questions',
    color: 'text-red-600',
    activeColor: 'bg-red-500 text-white',
  },
  {
    id: 'press-conference',
    label: 'Press Conference',
    desc: 'Multiple reporters taking turns, 10-12 questions',
    color: 'text-purple-600',
    activeColor: 'bg-purple-600 text-white',
  },
]

export default function DifficultySelector({ selected, onSelect }: DifficultySelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Difficulty</h3>
      <div className="grid grid-cols-2 gap-1.5 bg-gray-100 rounded-xl p-1">
        {LEVELS.map((level) => {
          const isActive = selected === level.id
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onSelect(level.id)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                isActive ? level.activeColor : 'text-gray-500 hover:text-gray-700 hover:bg-white'
              }`}
            >
              {level.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500">
        {LEVELS.find((l) => l.id === selected)?.desc}
      </p>
    </div>
  )
}
