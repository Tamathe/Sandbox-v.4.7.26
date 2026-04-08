'use client'

import { useState, useRef, useCallback } from 'react'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

const SILENCE_TIMEOUT_MS = 3500

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<unknown>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalTranscriptRef = useRef('')
  const callbackRef = useRef<((text: string) => void) | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const stopAndDeliver = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(recognitionRef.current as any)?.stop()
    setIsRecording(false)
    setInterimTranscript('')
    const text = finalTranscriptRef.current.trim()
    if (text && callbackRef.current) callbackRef.current(text)
    finalTranscriptRef.current = ''
    callbackRef.current = null
  }, [])

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(stopAndDeliver, SILENCE_TIMEOUT_MS)
  }, [stopAndDeliver])

  const startRecording = useCallback(
    (onFinalTranscript: (text: string) => void) => {
      if (!isSupported) {
        setError('Voice input is not supported in this browser. Try Chrome or Edge.')
        return
      }

      finalTranscriptRef.current = ''
      callbackRef.current = onFinalTranscript

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        // Accumulate all final segments into one running transcript
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += event.results[i][0].transcript + ' '
          } else {
            interim = event.results[i][0].transcript
          }
        }
        setInterimTranscript(interim || finalTranscriptRef.current.trim())
        // Any speech activity resets the silence countdown
        resetSilenceTimer()
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'aborted') setError(`Voice error: ${event.error}`)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        setIsRecording(false)
        setInterimTranscript('')
        finalTranscriptRef.current = ''
      }

      recognition.onend = () => {
        // In continuous mode onend fires if the browser cuts the stream;
        // let the silence timer handle delivery instead of stopping immediately.
        // Only clean up if we're no longer recording (e.g. manual stop).
        if (!recognitionRef.current) {
          setIsRecording(false)
          setInterimTranscript('')
        }
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
      setError(null)
      // Start the initial silence timer — if the user never speaks, stop after timeout
      resetSilenceTimer()
    },
    [isSupported, resetSilenceTimer]
  )

  const stopRecording = useCallback(() => {
    recognitionRef.current = null
    stopAndDeliver()
  }, [stopAndDeliver])

  return { isRecording, interimTranscript, error, isSupported, startRecording, stopRecording }
}
