'use client'

import { Headphones, Mic, Users } from 'lucide-react'

const TILES = [
  { icon: Headphones, label: 'Listen to lectures as podcasts', tab: 'browse' },
  { icon: Mic, label: 'Practice with voice tutoring', tab: 'voice' },
  { icon: Users, label: 'Try an interactive scenario', tab: 'scenarios' },
] as const

interface Props {
  onNavigateTab: (tab: string) => void
}

export default function AudioWelcomeCard({ onNavigateTab }: Props) {
  return (
    <section className="mb-6">
      <h2 className="font-extrabold text-lg text-gray-900 mb-3">Get Started with Audio</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {TILES.map(tile => {
          const Icon = tile.icon
          return (
            <button
              key={tile.tab}
              type="button"
              onClick={() => onNavigateTab(tile.tab)}
              className="min-w-[180px] flex-shrink-0 flex flex-col items-center gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[#0033A0] text-white">
                <Icon className="size-5" />
              </div>
              <span className="text-sm font-semibold text-gray-900">{tile.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
