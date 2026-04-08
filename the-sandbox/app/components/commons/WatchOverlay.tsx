'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, MonitorPlay, Send, Users } from 'lucide-react'
import ShareRoomButton from './ShareRoomButton'
import { useAuth } from '../../lib/auth-context'

interface WatchOverlayProps {
  roomId: string
  onClose: () => void
}

const REACTIONS = ['🔥', '😱', '💀', '👏', '😤', '🎉', '❤️', '😂']

interface FloatingReaction {
  id: number
  emoji: string
  name: string
  x: number
}

export default function WatchOverlay({ roomId, onClose }: WatchOverlayProps) {
  const { currentUser } = useAuth()
  const headers = { 'x-demo-user-email': currentUser.email }

  const [phase, setPhase] = useState<'LOBBY' | 'ACTIVE' | 'COMPLETE'>('LOBBY')
  const [title, setTitle] = useState('')
  const [hostId, setHostId] = useState('')
  const [participants, setParticipants] = useState<Array<{ userId: string; name: string }>>([])
  const [sandyMessages, setSandyMessages] = useState<string[]>([])
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const [connected, setConnected] = useState(false)
  const reactionIdRef = useRef(0)

  // Load initial state
  useEffect(() => {
    fetch(`/api/commons/${roomId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title)
        setHostId(data.hostId)
        setParticipants(data.participants ?? [])
        const p = data.phase
        setPhase(p === 'COMPLETE' ? 'COMPLETE' : p === 'LOBBY' ? 'LOBBY' : 'ACTIVE')
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // SSE stream
  useEffect(() => {
    const es = new EventSource(`/api/commons/${roomId}/stream`)
    es.addEventListener('connected', () => setConnected(true))

    es.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data)
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === data.userId)) return prev
        return [...prev, { userId: data.userId, name: data.name }]
      })
    })

    es.addEventListener('phase_changed', (e) => {
      const data = JSON.parse(e.data)
      const p = data.phase
      setPhase(p === 'COMPLETE' ? 'COMPLETE' : p === 'LOBBY' ? 'LOBBY' : 'ACTIVE')
    })

    es.addEventListener('watch_reaction', (e) => {
      const data = JSON.parse(e.data)
      const id = ++reactionIdRef.current
      setFloatingReactions((prev) => [...prev, {
        id,
        emoji: data.reaction,
        name: data.name,
        x: 10 + Math.random() * 80,
      }])
      // Remove after animation
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id))
      }, 2000)
    })

    es.addEventListener('sandy_says', (e) => {
      const data = JSON.parse(e.data)
      setSandyMessages((prev) => [...prev.slice(-5), data.message])
    })

    es.addEventListener('complete', () => setPhase('COMPLETE'))
    es.onerror = () => setConnected(false)

    return () => es.close()
  }, [roomId])

  const handleStart = useCallback(async () => {
    await fetch(`/api/commons/${roomId}/start`, { method: 'POST', headers })
  }, [roomId, headers])

  const handleReaction = useCallback(async (emoji: string) => {
    await fetch(`/api/commons/${roomId}/reaction`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: emoji }),
    })
  }, [roomId, headers])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-950 to-gray-900">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="size-4" />
          Back
        </button>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShareRoomButton roomId={roomId} roomType="WATCH" title={title} />
          <Users className="size-3.5" />
          {participants.length}
          {!connected && <span className="text-red-300">Reconnecting...</span>}
        </div>
      </div>

      {/* Main area */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6">
        {/* Floating reactions */}
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="pointer-events-none absolute animate-float-up text-3xl"
            style={{ left: `${r.x}%`, bottom: '20%' }}
          >
            {r.emoji}
          </div>
        ))}

        {phase === 'LOBBY' && (
          <div className="text-center">
            <MonitorPlay className="mx-auto mb-4 size-16 text-white/30" />
            <h3 className="mb-2 text-2xl font-black text-white">Watch Party</h3>
            <p className="mb-6 text-white/50">{participants.length} people ready to watch together</p>
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {participants.map((p) => (
                <div key={p.userId} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                  {p.name}
                </div>
              ))}
            </div>
            {hostId === currentUser?.id && (
              <button type="button" onClick={() => void handleStart()} className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-gray-900 hover:scale-105">
                Start Watch Party
              </button>
            )}
          </div>
        )}

        {phase === 'ACTIVE' && (
          <div className="text-center">
            <div className="mb-4 text-6xl">📺</div>
            <h3 className="mb-2 text-xl font-extrabold text-white">{title}</h3>
            <p className="mb-8 text-sm text-white/40">{participants.length} watching together</p>

            {/* Presence row */}
            <div className="mb-8 flex justify-center -space-x-1">
              {participants.slice(0, 10).map((p) => (
                <div key={p.userId} className="flex size-8 items-center justify-center rounded-full border-2 border-gray-900 bg-white/20 text-xs font-bold text-white" title={p.name}>
                  {p.name.charAt(0)}
                </div>
              ))}
            </div>

            {/* Reaction bar */}
            <div className="flex flex-wrap justify-center gap-2">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => void handleReaction(emoji)}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-2xl transition-transform hover:scale-110 hover:bg-white/20 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'COMPLETE' && (
          <div className="text-center">
            <div className="mx-auto mb-4 text-6xl">🎬</div>
            <h2 className="mb-2 text-3xl font-black text-white">That's a Wrap!</h2>
            <p className="mb-8 text-lg text-white/60">{participants.length} watched together</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-gray-900 hover:scale-105">
              Back to Chat
            </button>
          </div>
        )}
      </div>

      {/* Sandy commentary */}
      {sandyMessages.length > 0 && (
        <div className="border-t border-white/10 bg-white/5 px-6 py-3">
          <p className="text-center text-sm text-white/80">
            <span className="mr-1.5 font-bold text-amber-300">Sandy:</span>
            {sandyMessages[sandyMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
