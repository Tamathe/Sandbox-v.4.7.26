'use client'

import { OPENAI_AUDIO_VOICES, VOICE_DESCRIPTORS, OpenAIAudioVoice } from '../lib/audio-experience'

interface VoicePickerProps {
  value: OpenAIAudioVoice | string
  onChange: (voice: OpenAIAudioVoice) => void
  previewsEnabled?: boolean
}

export function VoicePicker({ value, onChange }: VoicePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {OPENAI_AUDIO_VOICES.map((voice) => {
        const descriptor = VOICE_DESCRIPTORS[voice]
        const isSelected = value === voice
        return (
          <button
            key={voice}
            type="button"
            onClick={() => onChange(voice)}
            className={`text-left rounded-xl border p-3 transition-all ${
              isSelected
                ? 'border-[#0033A0] bg-blue-50 ring-1 ring-[#0033A0]'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-semibold ${isSelected ? 'text-[#0033A0]' : 'text-gray-800'}`}>
                {descriptor.label}
              </span>
              {isSelected && (
                <span className="size-2 rounded-full bg-[#0033A0]" />
              )}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{descriptor.description}</p>
            <p className="mt-1 text-[10px] text-gray-400 italic">Best for: {descriptor.bestFor}</p>
          </button>
        )
      })}
    </div>
  )
}
