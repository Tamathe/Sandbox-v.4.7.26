import { useState, useRef, useCallback, useEffect } from 'react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

interface UseSandyVoiceOptions {
  submit: (content: string) => Promise<void>
  loading: boolean
  setInput: (value: string) => void
  setOpen: (open: boolean) => void
  setMobileOpen: (open: boolean) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onRecordingStart?: () => void
  /** When true, the auto-restart in continuous callback is skipped (auto-listen loop handles it) */
  voiceMode?: boolean
  /** When true, buffered voice text won't flush until Sandy finishes speaking */
  isSpeaking?: boolean
}

export function useSandyVoice({
  submit,
  loading,
  setInput,
  setOpen,
  setMobileOpen,
  inputRef,
  onRecordingStart,
  voiceMode = false,
  isSpeaking = false,
}: UseSandyVoiceOptions) {
  const { isRecording, interimTranscript, isSupported, startRecording, stopRecording } = useSpeechRecognition()

  const [continuousMode, setContinuousMode] = useState(false)
  const continuousModeRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPttActiveRef = useRef(false)
  const continuousTranscriptCallbackRef = useRef<((text: string) => void) | null>(null)
  const pendingVoiceRef = useRef<string | null>(null)
  const onRecordingStartRef = useRef(onRecordingStart)
  const voiceModeRef = useRef(voiceMode)
  const isSpeakingRef = useRef(isSpeaking)

  useEffect(() => { onRecordingStartRef.current = onRecordingStart }, [onRecordingStart])
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])

  // Sync interim transcript to input
  useEffect(() => {
    if (interimTranscript) setInput(interimTranscript)
  }, [interimTranscript, setInput])

  // Keep the continuous-mode transcript callback up to date
  useEffect(() => {
    continuousTranscriptCallbackRef.current = (text: string) => {
      if (!text.trim()) return
      setOpen(true)
      setMobileOpen(true)
      if (loading) {
        pendingVoiceRef.current = text
      } else {
        void submit(text)
      }
      // In voice mode, don't auto-restart recording here — the auto-listen loop
      // in ConciergePanel handles it after Sandy finishes speaking, preventing
      // the mic from capturing Sandy's own TTS audio.
      if (!voiceModeRef.current) {
        setTimeout(() => {
          if (continuousModeRef.current && continuousTranscriptCallbackRef.current) {
            startRecording(continuousTranscriptCallbackRef.current)
          }
        }, 300)
      }
    }
  }, [submit, startRecording, loading, setOpen, setMobileOpen])

  // Flush buffered voice utterance once Sandy finishes responding AND speaking
  useEffect(() => {
    if (!loading && !isSpeaking && pendingVoiceRef.current) {
      const text = pendingVoiceRef.current
      pendingVoiceRef.current = null
      void submit(text)
    }
  }, [loading, isSpeaking, submit])

  // Stop recognition on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (continuousModeRef.current) stopRecording()
    }
  }, [stopRecording])

  const handleMicPointerDown = useCallback((_e: React.PointerEvent) => {
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      if (!continuousModeRef.current) {
        isPttActiveRef.current = true
        onRecordingStartRef.current?.()
        startRecording((finalText: string) => {
          if (finalText.trim()) {
            setInput(finalText)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        })
      }
    }, 250)
  }, [startRecording, setInput, inputRef])

  const handleMicPointerUp = useCallback(() => {
    const wasClick = holdTimerRef.current !== null
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (isPttActiveRef.current) {
      isPttActiveRef.current = false
      stopRecording()
    } else if (wasClick) {
      if (continuousModeRef.current) {
        continuousModeRef.current = false
        setContinuousMode(false)
        stopRecording()
      } else {
        continuousModeRef.current = true
        setContinuousMode(true)
        onRecordingStartRef.current?.()
        if (continuousTranscriptCallbackRef.current) {
          startRecording(continuousTranscriptCallbackRef.current)
        }
      }
    }
  }, [stopRecording, startRecording])

  const handleMicPointerLeave = useCallback(() => {
    if (isPttActiveRef.current) {
      isPttActiveRef.current = false
      stopRecording()
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [stopRecording])

  // Programmatically start continuous listening (used by voice mode auto-listen)
  const startContinuousListening = useCallback(() => {
    if (continuousModeRef.current) return
    continuousModeRef.current = true
    setContinuousMode(true)
    onRecordingStartRef.current?.()
    if (continuousTranscriptCallbackRef.current) {
      startRecording(continuousTranscriptCallbackRef.current)
    }
  }, [startRecording])

  // Programmatically stop continuous listening (used when voice mode is disabled)
  const stopContinuousListening = useCallback(() => {
    if (!continuousModeRef.current) return
    continuousModeRef.current = false
    setContinuousMode(false)
    stopRecording()
  }, [stopRecording])

  return {
    isRecording,
    isSupported,
    continuousMode,
    handleMicPointerDown,
    handleMicPointerUp,
    handleMicPointerLeave,
    startContinuousListening,
    stopContinuousListening,
  }
}
