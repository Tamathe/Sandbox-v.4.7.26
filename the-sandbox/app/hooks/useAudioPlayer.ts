'use client'

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '../lib/auth-context'
import type { AudioPlayerPersona } from '../lib/audio-experience'
import type { PlayerState } from '../lib/audio/types'

type QueueStatus = 'queued' | 'loading' | 'ready' | 'error'

interface AudioQueueItem {
  id: string
  text: string
  status: QueueStatus
  objectUrl: string | null
}

interface AudioQueuePreview {
  id: string
  text: string
  status: QueueStatus
}

interface AudioPlayerContextValue {
  isActive: boolean
  isPlaying: boolean
  currentText: string | null
  persona: AudioPlayerPersona | null
  queue: AudioQueuePreview[]
  backgroundVolume: number
  playerState: PlayerState
  setPlayerState: (state: PlayerState) => void
  currentEpisodeId: string | null
  setCurrentEpisodeId: (id: string | null) => void
  currentPositionMs: number
  totalDurationMs: number
  progressPct: number
  activate: (persona: AudioPlayerPersona) => void
  configurePersona: (persona: AudioPlayerPersona) => void
  deactivate: () => void
  enqueue: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  clearQueue: () => void
  setBackgroundVolume: (value: number) => void
  addQuickBookmark: () => void
  skipBack: (ms: number) => void
  skipForward: (ms: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)

function createQueueItem(text: string): AudioQueueItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    status: 'queued',
    objectUrl: null,
  }
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentText, setCurrentText] = useState<string | null>(null)
  const [persona, setPersona] = useState<AudioPlayerPersona | null>(null)
  const [queue, setQueue] = useState<AudioQueuePreview[]>([])
  const [backgroundVolume, setBackgroundVolume] = useState(0.2)
  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null)
  const [currentPositionMs, setCurrentPositionMs] = useState(0)
  const [totalDurationMs, setTotalDurationMs] = useState(0)

  const speechAudioRef = useRef<HTMLAudioElement | null>(null)
  const ambienceAudioRef = useRef<HTMLAudioElement | null>(null)
  const queueRef = useRef<AudioQueueItem[]>([])
  const inflightRef = useRef<Map<string, Promise<void>>>(new Map())
  const isAttemptingPlaybackRef = useRef(false)
  const playNextRef = useRef<() => Promise<void>>(async () => {})

  const syncQueue = useCallback((nextQueue: AudioQueueItem[]) => {
    queueRef.current = nextQueue
    setQueue(
      nextQueue.map((item) => ({
        id: item.id,
        text: item.text,
        status: item.status,
      }))
    )
  }, [])

  const revokeItemUrl = useCallback((item: AudioQueueItem | undefined) => {
    if (item?.objectUrl) {
      URL.revokeObjectURL(item.objectUrl)
      item.objectUrl = null
    }
  }, [])

  const clearQueue = useCallback(() => {
    speechAudioRef.current?.pause()
    speechAudioRef.current?.removeAttribute('src')
    speechAudioRef.current?.load()
    setIsPlaying(false)
    setCurrentText(null)

    queueRef.current.forEach((item) => revokeItemUrl(item))
    inflightRef.current.clear()
    syncQueue([])
  }, [revokeItemUrl, syncQueue])

  const stop = useCallback(() => {
    clearQueue()
  }, [clearQueue])

  const deactivate = useCallback(() => {
    clearQueue()
    ambienceAudioRef.current?.pause()
    setIsActive(false)
    setPersona(null)
    setPlayerState('idle')
  }, [clearQueue])

  const ensureChunkReady = useCallback(
    async (item: AudioQueueItem, activePersona: AudioPlayerPersona) => {
      if (item.objectUrl || item.status === 'ready') return

      const existing = inflightRef.current.get(item.id)
      if (existing) {
        await existing
        return
      }

      item.status = 'loading'
      syncQueue([...queueRef.current])

      const request = fetch('/api/audio/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          text: item.text,
          voice: activePersona.voiceName,
          speed: activePersona.speed,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Audio synthesis failed')
          }

          const blob = await response.blob()
          item.objectUrl = URL.createObjectURL(blob)
          item.status = 'ready'
        })
        .catch((error) => {
          console.error('Audio chunk synthesis failed:', error)
          item.status = 'error'
        })
        .finally(() => {
          inflightRef.current.delete(item.id)
          syncQueue([...queueRef.current])
        })

      inflightRef.current.set(item.id, request)
      await request
    },
    [currentUser.email, syncQueue]
  )

  const updateAmbience = useCallback(() => {
    const ambience = ambienceAudioRef.current
    if (!ambience) return

    if (isActive && isPlaying && persona?.backgroundTrack) {
      if (ambience.src !== window.location.origin + persona.backgroundTrack) {
        ambience.src = persona.backgroundTrack
      }
      ambience.volume = backgroundVolume
      void ambience.play().catch(() => {})
    } else {
      ambience.pause()
    }
  }, [backgroundVolume, isActive, isPlaying, persona])

  const playNext = useCallback(async () => {
    if (!speechAudioRef.current || !isActive || !persona) return
    if (isAttemptingPlaybackRef.current) return

    const nextItem = queueRef.current[0]
    if (!nextItem) {
      setCurrentText(null)
      setIsPlaying(false)
      return
    }

    isAttemptingPlaybackRef.current = true

    try {
      await ensureChunkReady(nextItem, persona)
      if (!queueRef.current[0] || queueRef.current[0].id !== nextItem.id || !nextItem.objectUrl) {
        return
      }

      speechAudioRef.current.src = nextItem.objectUrl
      setCurrentText(nextItem.text)
      await speechAudioRef.current.play()
      setIsPlaying(true)

      const preloadCandidate = queueRef.current[1]
      if (preloadCandidate) {
        void ensureChunkReady(preloadCandidate, persona)
      }
    } catch (error) {
      console.error('Audio playback failed:', error)
      setIsPlaying(false)
    } finally {
      isAttemptingPlaybackRef.current = false
    }
  }, [ensureChunkReady, isActive, persona])

  useEffect(() => {
    playNextRef.current = playNext
  }, [playNext])

  const activate = useCallback((nextPersona: AudioPlayerPersona) => {
    setPersona(nextPersona)
    setIsActive(true)
    setPlayerState('bar')
  }, [])

  const configurePersona = useCallback((nextPersona: AudioPlayerPersona) => {
    setPersona(nextPersona)
  }, [])

  const enqueue = useCallback(
    (text: string) => {
      if (!text.trim()) return

      const nextQueue = [...queueRef.current, createQueueItem(text)]
      syncQueue(nextQueue)
    },
    [syncQueue]
  )

  const pause = useCallback(() => {
    speechAudioRef.current?.pause()
    ambienceAudioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const resume = useCallback(async () => {
    if (!isActive) return

    if (speechAudioRef.current?.src) {
      try {
        await speechAudioRef.current.play()
        setIsPlaying(true)
      } catch (error) {
        console.error('Failed to resume audio:', error)
      }
      return
    }

    await playNext()
  }, [isActive, playNext])

  useEffect(() => {
    const speechAudio = new Audio()
    speechAudio.preload = 'auto'
    speechAudioRef.current = speechAudio

    const ambienceAudio = new Audio()
    ambienceAudio.loop = true
    ambienceAudio.preload = 'auto'
    ambienceAudioRef.current = ambienceAudio
    const inflightMap = inflightRef.current

    const handleEnded = () => {
      const finished = queueRef.current[0]
      revokeItemUrl(finished)
      syncQueue(queueRef.current.slice(1))
      setCurrentText(null)
      setIsPlaying(false)
      void playNextRef.current()
    }

    const handlePause = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)
    const handleTimeUpdate = () => {
      setCurrentPositionMs(Math.round(speechAudio.currentTime * 1000))
    }
    const handleDurationChange = () => {
      if (speechAudio.duration && isFinite(speechAudio.duration)) {
        setTotalDurationMs(Math.round(speechAudio.duration * 1000))
      }
    }

    speechAudio.addEventListener('ended', handleEnded)
    speechAudio.addEventListener('pause', handlePause)
    speechAudio.addEventListener('play', handlePlay)
    speechAudio.addEventListener('timeupdate', handleTimeUpdate)
    speechAudio.addEventListener('durationchange', handleDurationChange)

    return () => {
      speechAudio.pause()
      ambienceAudio.pause()
      speechAudio.removeEventListener('ended', handleEnded)
      speechAudio.removeEventListener('pause', handlePause)
      speechAudio.removeEventListener('play', handlePlay)
      speechAudio.removeEventListener('timeupdate', handleTimeUpdate)
      speechAudio.removeEventListener('durationchange', handleDurationChange)
      queueRef.current.forEach((item) => revokeItemUrl(item))
      inflightMap.clear()
    }
  }, [revokeItemUrl, syncQueue])

  useEffect(() => {
    if (!isActive || !persona) return
    if (!isPlaying && !speechAudioRef.current?.src) {
      void playNext()
    }
  }, [isActive, persona, isPlaying, playNext, queue])

  useEffect(() => {
    updateAmbience()
  }, [updateAmbience])

  const skipBack = useCallback((ms: number) => {
    if (!speechAudioRef.current) return
    const secs = ms / 1000
    speechAudioRef.current.currentTime = Math.max(0, speechAudioRef.current.currentTime - secs)
  }, [])

  const skipForward = useCallback((ms: number) => {
    if (!speechAudioRef.current) return
    const secs = ms / 1000
    const duration = speechAudioRef.current.duration || 0
    speechAudioRef.current.currentTime = Math.min(duration, speechAudioRef.current.currentTime + secs)
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    if (!isActive || !persona) {
      navigator.mediaSession.metadata = null
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: persona.toolName,
      artist: persona.personaName,
      album: 'University of Kentucky',
      artwork: persona.artworkUrl
        ? [{ src: persona.artworkUrl, sizes: '512x512', type: 'image/png' }]
        : undefined,
    })
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    navigator.mediaSession.setActionHandler('play', () => {
      void resume()
    })
    navigator.mediaSession.setActionHandler('pause', pause)
    navigator.mediaSession.setActionHandler('stop', deactivate)
    navigator.mediaSession.setActionHandler('seekbackward', () => skipBack(15_000))
    navigator.mediaSession.setActionHandler('seekforward', () => skipForward(30_000))
  }, [deactivate, isActive, isPlaying, pause, persona, resume, skipBack, skipForward])

  const progressPct = totalDurationMs > 0 ? Math.min(100, (currentPositionMs / totalDurationMs) * 100) : 0

  const addQuickBookmark = useCallback(() => {
    if (!currentEpisodeId || !currentUser?.email) return
    fetch(`/api/audio/history/${currentEpisodeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ bookmark: { timestampMs: currentPositionMs, note: 'Bookmark' } }),
    }).catch(() => {})
  }, [currentEpisodeId, currentUser?.email, currentPositionMs])

  // Auto-save listening position every 30s + on tab hide/close
  const savePositionRef = useRef<() => void>(() => {})
  savePositionRef.current = () => {
    if (!currentEpisodeId || !currentUser?.email || !isActive) return
    const pct = totalDurationMs > 0 ? Math.round((currentPositionMs / totalDurationMs) * 100) : 0
    fetch(`/api/audio/history/${currentEpisodeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ positionMs: currentPositionMs, completedPct: pct }),
    }).catch(() => {})
  }

  useEffect(() => {
    if (!isActive || !currentEpisodeId) return

    const interval = setInterval(() => savePositionRef.current(), 30_000)
    const handleVisChange = () => {
      if (document.visibilityState === 'hidden') savePositionRef.current()
    }
    document.addEventListener('visibilitychange', handleVisChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisChange)
      savePositionRef.current() // save on unmount too
    }
  }, [isActive, currentEpisodeId])

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      isActive,
      isPlaying,
      currentText,
      persona,
      queue,
      backgroundVolume,
      playerState,
      setPlayerState,
      currentEpisodeId,
      setCurrentEpisodeId,
      currentPositionMs,
      totalDurationMs,
      progressPct,
      activate,
      configurePersona,
      deactivate,
      enqueue,
      pause,
      resume,
      stop,
      clearQueue,
      setBackgroundVolume,
      addQuickBookmark,
      skipBack,
      skipForward,
    }),
    [
      activate,
      addQuickBookmark,
      backgroundVolume,
      clearQueue,
      configurePersona,
      currentEpisodeId,
      currentPositionMs,
      currentText,
      deactivate,
      enqueue,
      isActive,
      isPlaying,
      pause,
      persona,
      playerState,
      progressPct,
      queue,
      resume,
      skipBack,
      skipForward,
      stop,
      totalDurationMs,
    ]
  )

  return createElement(AudioPlayerContext.Provider, { value }, children)
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  }

  return context
}
