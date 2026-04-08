'use client'

import { MessageCircle, Mic, BookOpen, ClipboardCheck, Users, Sparkles } from 'lucide-react'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

const MODES: { id: VoiceTutoringMode; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'socratic', label: 'Socratic Dialogue', description: 'Sandy asks probing questions to deepen understanding', icon: MessageCircle },
  { id: 'rehearsal', label: 'Verbal Rehearsal', description: 'Explain a concept as if teaching Sandy', icon: Mic },
  { id: 'walkthrough', label: 'Guided Walkthrough', description: 'Sandy walks you through a topic step by step', icon: BookOpen },
  { id: 'assessment', label: 'Oral Assessment', description: 'Timed verbal quiz with rubric scoring', icon: ClipboardCheck },
  { id: 'scenario', label: 'Interactive Scenario', description: 'Role-play a professional scenario', icon: Users },
]

interface Props {
  selected: VoiceTutoringMode | null
  onSelect: (mode: VoiceTutoringMode) => void
  suggestedMode?: { mode: VoiceTutoringMode; reason: string } | null
  suggestLoading?: boolean
}

export default function VoiceModeSelector({ selected, onSelect, suggestedMode, suggestLoading }: Props) {
  const suggestedModeData = suggestedMode ? MODES.find(m => m.id === suggestedMode.mode) : null

  return (
    <div className="space-y-4">
      {/* Sandy's recommendation CTA */}
      {suggestLoading && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-blue-100 rounded w-1/2" />
        </div>
      )}

      {suggestedModeData && suggestedMode && !suggestLoading && (
        <button
          type="button"
          onClick={() => onSelect(suggestedMode.mode)}
          className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
            selected === suggestedMode.mode
              ? 'border-[#0033A0] bg-[#0033A0] text-white'
              : 'border-[#0033A0] bg-[#0033A0]/5 hover:bg-[#0033A0]/10'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`size-4 ${selected === suggestedMode.mode ? 'text-white' : 'text-[#0033A0]'}`} />
            <span className={`font-extrabold text-sm ${selected === suggestedMode.mode ? 'text-white' : 'text-[#0033A0]'}`}>
              Sandy Recommends: {suggestedModeData.label}
            </span>
          </div>
          <p className={`text-xs ${selected === suggestedMode.mode ? 'text-white/80' : 'text-gray-600'}`}>
            {suggestedMode.reason}
          </p>
          <p className={`text-xs font-semibold mt-2 ${selected === suggestedMode.mode ? 'text-white' : 'text-[#0033A0]'}`}>
            Start Recommended Session →
          </p>
        </button>
      )}

      {/* Mode list */}
      <div>
        <h3 className="font-extrabold text-base text-gray-900 mb-3">
          {suggestedMode ? 'Or choose a mode' : 'Choose a Mode'}
        </h3>
        <div className="space-y-2">
          {MODES.map(m => {
            const Icon = m.icon
            const isSelected = selected === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'border-[#0033A0] bg-[#0033A0]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`size-4 flex-shrink-0 ${isSelected ? 'text-[#0033A0]' : 'text-gray-500'}`} />
                <div className="min-w-0">
                  <span className={`font-semibold text-sm ${isSelected ? 'text-[#0033A0]' : 'text-gray-900'}`}>{m.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{m.description}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
