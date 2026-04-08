import { useState, useRef, useCallback, useEffect } from 'react'
import { extractCompleteSentences, sanitizeSpeechText } from '../../lib/audio-experience'

const SANDY_VOICE = 'nova'
const SANDY_SPEED = 1.0

interface UseSandyStreamingTTSOptions {
  userEmail: string
  onSpeakingDone?: () => void
}

/**
 * Streaming TTS for Sandy's concierge panel.
 *
 * As Claude streams a response, call `feedText(cleanText)` on each chunk.
 * The hook extracts complete sentences, synthesizes them via OpenAI TTS,
 * and plays them sequentially — so the user hears the first sentence
 * while the rest is still generating.
 *
 * Call `finalize(cleanText)` when the stream ends to flush any remainder.
 * Call `reset()` before each new message to clear sentence tracking.
 * Call `interrupt()` to stop all audio immediately (e.g. when user starts speaking).
 */
export function useSandyStreamingTTS({ userEmail, onSpeakingDone }: UseSandyStreamingTTSOptions) {
  const [voiceMode, setVoiceMode] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const voiceModeRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<string[]>([])
  const processedUpToRef = useRef(0)
  const isPlayingRef = useRef(false)
  const pendingSynthRef = useRef(0)
  const streamDoneRef = useRef(false)
  const onSpeakingDoneRef = useRef(onSpeakingDone)
  const playNextRef = useRef<() => void>(() => {})
  const synthChainRef = useRef<Promise<void>>(Promise.resolve())

  // Keep refs in sync with latest values
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { onSpeakingDoneRef.current = onSpeakingDone }, [onSpeakingDone])

  // Check if all audio is done and fire the callback
  const maybeFireDone = useCallback(() => {
    if (
      streamDoneRef.current &&
      pendingSynthRef.current === 0 &&
      queueRef.current.length === 0 &&
      !isPlayingRef.current
    ) {
      setIsSpeaking(false)
      onSpeakingDoneRef.current?.()
    }
  }, [])

  // Play the next queued audio chunk, or signal completion
  const playNext = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    const next = queueRef.current.shift()
    if (next) {
      audio.src = next
      void audio.play().catch(() => {
        URL.revokeObjectURL(next)
        isPlayingRef.current = false
        playNextRef.current()
      })
    } else {
      isPlayingRef.current = false
      maybeFireDone()
    }
  }, [maybeFireDone])

  useEffect(() => { playNextRef.current = playNext }, [playNext])

  // Create the Audio element once on mount
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    const handleEnded = () => {
      if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src)
      playNextRef.current()
    }

    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
      queueRef.current.forEach(url => URL.revokeObjectURL(url))
      queueRef.current = []
    }
  }, [])

  // Start playback immediately if nothing is playing, otherwise queue
  const playOrEnqueue = useCallback((blobUrl: string) => {
    if (!isPlayingRef.current && audioRef.current) {
      isPlayingRef.current = true
      setIsSpeaking(true)
      audioRef.current.src = blobUrl
      void audioRef.current.play().catch(() => {
        URL.revokeObjectURL(blobUrl)
        isPlayingRef.current = false
        playNextRef.current()
      })
    } else {
      queueRef.current.push(blobUrl)
    }
  }, [])

  // Synthesize a single sentence and enqueue the resulting audio
  const synthesizeAndEnqueue = useCallback(async (text: string) => {
    const clean = sanitizeSpeechText(text)
    if (!clean || clean.length < 2) return

    pendingSynthRef.current++
    try {
      const res = await fetch('/api/audio/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': userEmail,
        },
        body: JSON.stringify({
          text: clean.slice(0, 1500),
          voice: SANDY_VOICE,
          speed: SANDY_SPEED,
        }),
      })
      if (!res.ok) return

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      playOrEnqueue(url)
    } catch {
      // TTS failed for this sentence — skip it
    } finally {
      pendingSynthRef.current--
      maybeFireDone()
    }
  }, [userEmail, playOrEnqueue, maybeFireDone])

  // Feed the full accumulated clean text on each stream chunk.
  // Extracts new complete sentences and sends them to TTS.
  const feedText = useCallback((fullCleanText: string) => {
    if (!voiceModeRef.current) return

    const unprocessed = fullCleanText.slice(processedUpToRef.current)
    const { sentences, remainder } = extractCompleteSentences(unprocessed)

    if (sentences.length > 0) {
      processedUpToRef.current = fullCleanText.length - remainder.length
      for (const sentence of sentences) {
        // Chain sequentially so sentences play in order (parallel fetch can resolve out-of-order)
        synthChainRef.current = synthChainRef.current.then(() => synthesizeAndEnqueue(sentence))
      }
    }
  }, [synthesizeAndEnqueue])

  // Call when the stream finishes to flush any remaining text.
  const finalize = useCallback((fullCleanText: string) => {
    if (!voiceModeRef.current) return

    streamDoneRef.current = true
    const remainder = fullCleanText.slice(processedUpToRef.current).trim()
    if (remainder) {
      void synthesizeAndEnqueue(remainder)
    } else {
      maybeFireDone()
    }
  }, [synthesizeAndEnqueue, maybeFireDone])

  // Reset sentence tracking before a new streaming message.
  const reset = useCallback(() => {
    processedUpToRef.current = 0
    streamDoneRef.current = false
    synthChainRef.current = Promise.resolve()
  }, [])

  // Stop all audio immediately (e.g. when user starts speaking).
  const interrupt = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      if (audio.src?.startsWith('blob:')) URL.revokeObjectURL(audio.src)
      audio.removeAttribute('src')
    }
    queueRef.current.forEach(url => URL.revokeObjectURL(url))
    queueRef.current = []
    isPlayingRef.current = false
    pendingSynthRef.current = 0
    streamDoneRef.current = false
    synthChainRef.current = Promise.resolve()
    setIsSpeaking(false)
  }, [])

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode(prev => {
      const next = !prev
      if (!next) interrupt()
      try { localStorage.setItem('sandy-voice-mode', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }, [interrupt])

  // Hydrate voice mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sandy-voice-mode')
      if (stored === '1') {
        setVoiceMode(true)
        voiceModeRef.current = true
      }
    } catch { /* ignore */ }
  }, [])

  return {
    voiceMode,
    isSpeaking,
    toggleVoiceMode,
    feedText,
    finalize,
    reset,
    interrupt,
  }
}
