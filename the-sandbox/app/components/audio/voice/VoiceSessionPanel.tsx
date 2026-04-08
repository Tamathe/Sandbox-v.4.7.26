'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, PauseCircle, PlayCircle } from 'lucide-react'
import { useVoiceSession } from '../../../hooks/useVoiceSession'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import VoiceModeSelector from './VoiceModeSelector'
import LiveTranscript from './LiveTranscript'
import SessionTimer from './SessionTimer'
import SessionReport from './SessionReport'
import SessionNextSteps from './SessionNextSteps'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

export default function VoiceSessionPanel() {
  const {
    phase, mode, transcript, summary, scores, loading, startedAt, sessionId,
    startSession, endSession, pauseSession, resumeSession, reset,
  } = useVoiceSession()
  const [selectedMode, setSelectedMode] = useState<VoiceTutoringMode | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { currentUser } = useAuth()
  const [suggestedMode, setSuggestedMode] = useState<{ mode: VoiceTutoringMode; reason: string } | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(true)

  useEffect(() => {
    if (phase !== 'select' || !currentUser?.email) return
    const controller = new AbortController()
    setSuggestLoading(true)
    apiFetch(currentUser.email, '/api/audio/voice-session/suggest', { signal: controller.signal })
      .then(data => setSuggestedMode(data as { mode: VoiceTutoringMode; reason: string }))
      .catch(() => {}) // Degrade silently
      .finally(() => setSuggestLoading(false))
    return () => controller.abort()
  }, [phase, currentUser?.email])

  const handleEndClick = useCallback(() => {
    if (!confirmPending) {
      setConfirmPending(true)
      confirmTimerRef.current = setTimeout(() => setConfirmPending(false), 3000)
      return
    }
    // Second tap — actually end
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setConfirmPending(false)
    void endSession()
  }, [confirmPending, endSession])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [])

  if (phase === 'select') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <VoiceModeSelector
          selected={selectedMode}
          onSelect={setSelectedMode}
          suggestedMode={suggestedMode}
          suggestLoading={suggestLoading}
        />
        {selectedMode && (
          <button
            type="button"
            onClick={() => startSession(selectedMode)}
            disabled={loading}
            className="w-full py-3 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Begin Session'}
          </button>
        )}
      </div>
    )
  }

  if (phase === 'active' || phase === 'paused' || phase === 'ending') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-[#0033A0]" />
            <span className="font-semibold text-sm text-gray-900 capitalize">{mode}</span>
          </div>
          <SessionTimer startedAt={startedAt} />
        </div>

        {phase === 'paused' && (
          <div className="flex flex-col items-center justify-center py-8 bg-gray-50">
            <p className="text-lg font-extrabold text-gray-900 mb-3">Paused</p>
            <button
              type="button"
              onClick={resumeSession}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors"
            >
              <PlayCircle className="size-4" />
              Resume
            </button>
          </div>
        )}

        <LiveTranscript entries={transcript} isListening={phase === 'active'} />

        <div className="px-4 py-3 border-t border-gray-100 flex justify-center gap-3">
          {phase === 'active' && (
            <button
              type="button"
              onClick={pauseSession}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
            >
              <PauseCircle className="size-4" />
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={handleEndClick}
            disabled={phase === 'ending'}
            className={`flex items-center gap-2 px-6 py-2.5 font-semibold rounded-xl transition-colors disabled:opacity-50 ${
              confirmPending
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            <Square className="size-4" />
            {phase === 'ending'
              ? 'Ending...'
              : confirmPending
                ? 'Tap again to end'
                : 'End Session'}
          </button>
        </div>
      </div>
    )
  }

  // Report phase
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <SessionReport summary={summary} scores={scores} durationSecs={null} />
      {sessionId && (
        <SessionNextSteps
          sessionId={sessionId}
          summary={summary}
          onRetry={(retryMode) => {
            reset()
            setSelectedMode(retryMode)
          }}
        />
      )}
      <button
        type="button"
        onClick={reset}
        className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
      >
        Start New Session
      </button>
    </div>
  )
}
