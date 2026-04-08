'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, GraduationCap, Loader2, MonitorPlay, Swords, Users } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface RoomData {
  id: string
  type: string
  title: string
  phase: string
  participantCount: number
  participants: Array<{ userId: string; name: string }>
  groupId: string | null
  groupName: string | null
}

const TYPE_CONFIG: Record<string, { emoji: string; label: string; icon: typeof Swords; gradient: string }> = {
  CHALLENGE: { emoji: '🎯', label: 'Quiz Battle', icon: Swords, gradient: 'from-[#001a52] to-[#0033A0]' },
  STUDY: { emoji: '📚', label: 'Study Session', icon: BookOpen, gradient: 'from-green-900 to-green-800' },
  WATCH: { emoji: '📺', label: 'Watch Party', icon: MonitorPlay, gradient: 'from-gray-950 to-gray-900' },
  TEACHBACK: { emoji: '🎓', label: 'Teach-Back', icon: GraduationCap, gradient: 'from-indigo-950 to-indigo-900' },
}

export default function JoinRoomClient({ room }: { room: RoomData }) {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = TYPE_CONFIG[room.type] ?? TYPE_CONFIG.CHALLENGE
  const Icon = config.icon
  const isComplete = room.phase === 'COMPLETE'
  const isAlreadyIn = room.participants.some((p) => p.userId === currentUser?.id)

  const handleJoin = async () => {
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/join-room/${room.id}`)}`)
      return
    }

    setJoining(true)
    setError(null)

    try {
      // If already a participant, skip the join call
      if (!isAlreadyIn) {
        const res = await fetch(`/api/commons/${room.id}/join`, {
          method: 'POST',
          headers: { 'x-demo-user-email': currentUser.email },
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to join room')
          setJoining(false)
          return
        }
      }

      // Redirect to messages where the room overlay will open
      if (room.groupId) {
        router.push(`/messages/${room.groupId}`)
      } else {
        router.push('/messages')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setJoining(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0033A0]/5 to-white px-4">
      <div className="w-full max-w-sm">
        {/* Room card */}
        <div className={`mb-6 overflow-hidden rounded-2xl bg-gradient-to-b ${config.gradient} p-6 text-center shadow-xl`}>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-xl bg-white/10">
            <Icon className="size-7 text-white" />
          </div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">
            {config.label}
          </div>
          <h1 className="mb-4 text-xl font-extrabold text-white">
            {room.title || config.label}
          </h1>

          {/* Participants */}
          <div className="flex items-center justify-center gap-2 text-sm text-white/70">
            <Users className="size-4" />
            <span>
              {room.participantCount} {room.participantCount === 1 ? 'person' : 'people'} {isComplete ? 'participated' : 'in room'}
            </span>
          </div>

          {/* Participant names */}
          {room.participants.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {room.participants.slice(0, 5).map((p) => (
                <span
                  key={p.userId}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80"
                >
                  {p.name.split(' ')[0]}
                </span>
              ))}
              {room.participantCount > 5 && (
                <span className="text-xs text-white/50">+{room.participantCount - 5} more</span>
              )}
            </div>
          )}

          {/* Phase badge */}
          <div className="mt-4">
            {isComplete ? (
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/60">
                Session Ended
              </span>
            ) : room.phase === 'LOBBY' ? (
              <span className="inline-flex rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                Waiting for players
              </span>
            ) : (
              <span className="inline-flex animate-pulse rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
                In progress
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isComplete ? (
            <>
              <p className="text-center text-sm text-gray-500">This session has ended.</p>
              <a
                href="/community"
                className="flex w-full items-center justify-center rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Find Active Rooms
              </a>
            </>
          ) : isAlreadyIn ? (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {joining ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              Return to Room
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {joining ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              Join Room
            </button>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}

          <a
            href="/"
            className="block text-center text-sm text-gray-400 transition-colors hover:text-gray-600"
          >
            Go to University of Kentucky
          </a>
        </div>

        {/* Branding */}
        <div className="mt-8 text-center text-xs text-gray-300">
          University of Kentucky by CATS-AI
        </div>
      </div>
    </div>
  )
}
