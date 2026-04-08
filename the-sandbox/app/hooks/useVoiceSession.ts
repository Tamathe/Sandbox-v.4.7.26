'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import type { VoiceTutoringMode, TranscriptEntry, ScoreDimension } from '../lib/audio/types'

type SessionPhase = 'select' | 'active' | 'paused' | 'ending' | 'report'

export function useVoiceSession() {
  const { currentUser } = useAuth()
  const [phase, setPhase] = useState<SessionPhase>('select')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<VoiceTutoringMode | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreDimension[]>([])
  const [loading, setLoading] = useState(false)
  const startTimeRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)

  const startSession = useCallback(async (
    selectedMode: VoiceTutoringMode,
    options?: { courseId?: string; topicTags?: string[]; scenarioId?: string },
  ) => {
    if (!currentUser?.email) return
    setLoading(true)
    try {
      const session = await apiFetch(currentUser.email, '/api/audio/voice-session', {
        method: 'POST',
        body: JSON.stringify({ type: selectedMode, ...options }),
      })
      setSessionId((session as { id: string }).id)
      setMode(selectedMode)
      setPhase('active')
      startTimeRef.current = Date.now()
      pausedElapsedRef.current = 0
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email])

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => {
      const next = [...prev, entry]
      transcriptRef.current = next
      return next
    })
  }, [])

  const pauseSession = useCallback(() => {
    pausedAtRef.current = Date.now()
    setPhase('paused')
  }, [])

  const resumeSession = useCallback(() => {
    if (pausedAtRef.current > 0) {
      pausedElapsedRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = 0
    }
    setPhase('active')
  }, [])

  const endSession = useCallback(async () => {
    if (!currentUser?.email || !sessionId) return
    setPhase('ending')
    let totalPaused = pausedElapsedRef.current
    if (pausedAtRef.current > 0) {
      totalPaused += Date.now() - pausedAtRef.current
    }
    const durationSecs = Math.floor((Date.now() - startTimeRef.current - totalPaused) / 1000)
    try {
      const result = await apiFetch(currentUser.email, `/api/audio/voice-session/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ transcript: transcriptRef.current, status: 'completed', durationSecs }),
      })
      setSummary((result as { summary?: string }).summary ?? null)

      const scoreResult = await apiFetch(currentUser.email, `/api/audio/voice-session/${sessionId}/score`, {
        method: 'POST',
        body: JSON.stringify({ scores: [] }),
      })
      setScores((scoreResult as { scores?: ScoreDimension[] }).scores ?? [])
    } catch {
      // Session saved even if scoring fails
    } finally {
      setPhase('report')
    }
  }, [currentUser?.email, sessionId])

  const reset = useCallback(() => {
    setPhase('select')
    setSessionId(null)
    setMode(null)
    setTranscript([])
    setSummary(null)
    setScores([])
    pausedElapsedRef.current = 0
    pausedAtRef.current = 0
  }, [])

  return {
    phase,
    sessionId,
    mode,
    transcript,
    summary,
    scores,
    loading,
    startedAt: startTimeRef.current,
    pausedElapsed: pausedElapsedRef.current,
    startSession,
    addTranscriptEntry,
    pauseSession,
    resumeSession,
    endSession,
    reset,
  }
}
