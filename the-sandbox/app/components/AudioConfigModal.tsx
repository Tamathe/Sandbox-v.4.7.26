'use client'

import { useState } from 'react'
import { Headphones, Loader2 } from 'lucide-react'
import { ModalShell } from './ui/ModalShell'
import { VoicePicker } from './VoicePicker'
import { OpenAIAudioVoice, OPENAI_AUDIO_VOICES } from '../lib/audio-experience'

interface AudioConfigModalProps {
  toolId: string
  userEmail: string
  initialAudioEnabled: boolean
  initialVoiceName: string | null
  initialSpeed: number
  initialPersonaName: string | null
  toolName: string
  onClose: () => void
  onSaved: (config: {
    audioEnabled: boolean
    audioVoiceName: string | null
    audioSpeed: number
    audioPersonaName: string | null
  }) => void
}

export function AudioConfigModal({
  toolId,
  userEmail,
  initialAudioEnabled,
  initialVoiceName,
  initialSpeed,
  initialPersonaName,
  toolName,
  onClose,
  onSaved,
}: AudioConfigModalProps) {
  const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled)
  const [voiceName, setVoiceName] = useState<OpenAIAudioVoice>(
    (OPENAI_AUDIO_VOICES.includes(initialVoiceName as OpenAIAudioVoice)
      ? initialVoiceName
      : 'alloy') as OpenAIAudioVoice
  )
  const [speed, setSpeed] = useState(initialSpeed || 1)
  const [personaName, setPersonaName] = useState(
    initialPersonaName || suggestPersonaName(toolName)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/tools/${toolId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          audioEnabled,
          audioVoiceName: audioEnabled ? voiceName : null,
          audioSpeed: speed,
          audioPersonaName: audioEnabled ? personaName.trim() || null : null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSaved({
        audioEnabled,
        audioVoiceName: audioEnabled ? voiceName : null,
        audioSpeed: speed,
        audioPersonaName: audioEnabled ? personaName.trim() || null : null,
      })
      onClose()
    } catch {
      setError('Could not save audio settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Audio Settings" icon={Headphones} onClose={onClose} zIndex={50}>
        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable audio mode</p>
              <p className="text-xs text-gray-500">Students can listen to AI responses read aloud</p>
            </div>
            <button
              type="button"
              onClick={() => setAudioEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                audioEnabled ? 'bg-[#0033A0]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                  audioEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {audioEnabled && (
            <>
              {/* Voice picker */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Voice</label>
                <VoicePicker value={voiceName} onChange={setVoiceName} />
              </div>

              {/* Speed slider */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Speed — <span className="text-[#0033A0]">{speed.toFixed(2)}×</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#0033A0]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                  <span>0.5×</span><span>1×</span><span>2×</span>
                </div>
              </div>

              {/* Persona name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Persona name <span className="text-gray-400 font-normal">(how the voice introduces itself)</span>
                </label>
                <input
                  type="text"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder="e.g. Sandy, Professor Oak"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002580] disabled:opacity-60"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </button>
        </div>
    </ModalShell>
  )
}

function suggestPersonaName(toolName: string): string {
  const name = toolName.trim()
  if (!name) return ''
  const words = name.split(/\s+/)
  if (words.length === 1) return words[0]
  return words.slice(0, 2).join(' ')
}
